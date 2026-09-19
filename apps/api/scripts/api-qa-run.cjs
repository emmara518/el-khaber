/**
 * End-to-end API QA run against the local QA API (khabir_test).
 * Covers: customer request lifecycle (create->accept->start->complete->review),
 * cancel path, technician self-service, merchant surface, notifications.
 * Read-mostly; creates a small number of marked QA rows.
 */
const BASE = process.env.QA_API_BASE || 'http://localhost:3100/api/v1';
const PASSWORD = 'sup3rsecretP4ss';
const results = [];
let customerToken = '';
let technicianToken = '';
let merchantToken = '';

function log(name, ok, extra = '') {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`);
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function login(path, email) {
  const r = await req('POST', path, { body: { email, password: PASSWORD } });
  if (r.status !== 200) throw new Error(`${path} login failed ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  return { token: r.json.data.accessToken, user: r.json.data.user };
}

async function main() {
  // ---- auth
  const customer = await login('/auth/login', 'customer@qa.local');
  customerToken = customer.token;
  log('customer login', customer.user && customer.user.role === 'customer', customer.user.role);

  const technician = await login('/auth/login', 'technician@qa.local');
  technicianToken = technician.token;
  log('technician login', technician.user && technician.user.role === 'technician', technician.user.role);

  const merchant = await login('/auth/login', 'merchant@qa.local');
  merchantToken = merchant.token;
  log('merchant login', merchant.user && merchant.user.role === 'merchant', merchant.user.role);

  const badLogin = await req('POST', '/auth/login', { body: { email: 'customer@qa.local', password: 'wrong' } });
  log('login negative (401)', badLogin.status === 401, `status=${badLogin.status}`);

  const noAuthMe = await req('GET', '/me');
  log('me unauthenticated (401)', noAuthMe.status === 401, `status=${noAuthMe.status}`);

  // ---- catalog + ids
  const cats = await req('GET', '/appliance-categories');
  const cat = cats.json.data[0];
  log('catalog categories', cats.status === 200 && cat, cat && `${cat.nameAr}/${cat.id}`);
  const svc = await req('GET', '/services?appliance_category_id=' + cat.id);
  const service = (svc.json.data || [])[0];
  log('catalog services', svc.status === 200 && service, service && service.id);
  const faults = await req('GET', '/faults?appliance_category_id=' + cat.id);
  const fault = (faults.json.data || [])[0];
  log('catalog faults', faults.status === 200 && fault, fault && fault.id);
  const techs = await req('GET', '/technicians?category_id=' + cat.id);
  const techList = techs.json.data || [];
  const tech = techList[0];
  log('discovery technicians', techs.status === 200 && tech, tech && tech.id);
  const locs = await req('GET', '/locations', { token: customerToken });
  const loc = locs.json.data[0];
  log('customer locations', locs.status === 200 && loc, loc && loc.id);

  // ---- create service request
  const create = await req('POST', '/service-requests', {
    token: customerToken,
    body: {
      technician_id: tech.id,
      appliance_category_id: cat.id,
      service_id: service.id,
      fault_id: fault.id,
      problem_title: 'QA-run: washer not spinning',
      problem_description: 'QA automated lifecycle check - machine will not spin during cycle',
      location_id: loc.id,
    },
  });
  const srId = create.json.data && create.json.data.id;
  log('create service request', create.status === 201 && srId, `status=${create.status} id=${srId}`);
  const detail = await req('GET', `/service-requests/${srId}`, { token: customerToken });
  log('request detail (pending)', detail.status === 200 && detail.json.data.status === 'pending', detail.json.data.status);

  // ---- negative: technician cannot create; unauth cannot create
  const neg1 = await req('POST', '/service-requests', { token: technicianToken, body: {} });
  log('create as technician forbidden', neg1.status === 403 || neg1.status === 401, `status=${neg1.status}`);
  const neg2 = await req('POST', '/service-requests', { body: {} });
  log('create unauthenticated 401', neg2.status === 401, `status=${neg2.status}`);

  // ---- technician accepts
  const accept = await req('POST', `/service-requests/${srId}/accept`, { token: technicianToken });
  log('technician accept', accept.status === 200, `status=${accept.status}`);
  const accepted = await req('GET', `/service-requests/${srId}`, { token: customerToken });
  log('status=accepted', accepted.json.data.status === 'accepted', accepted.json.data.status);

  // ---- conversation opens
  const conv = await req('GET', `/service-requests/${srId}/conversation`, { token: customerToken });
  const convId = conv.json.data && conv.json.data.id;
  log('conversation exists', conv.status === 200 && convId, convId);
  const msg = await req('POST', `/conversations/${convId}/messages`, {
    token: customerToken,
    body: { body: 'QA: please arrive before 5pm' },
  });
  log('send message', msg.status === 201, `status=${msg.status}`);
  const msgs = await req('GET', `/conversations/${convId}/messages`, { token: technicianToken });
  log('read messages (other party)', msgs.status === 200 && (msgs.json.data || []).length >= 1, `count=${(msgs.json.data || []).length}`);

  // ---- start x2 (accepted->on_the_way->in_progress) -> complete
  const start1 = await req('POST', `/service-requests/${srId}/start`, { token: technicianToken });
  log('technician start #1 (->on_the_way)', start1.status === 200, `status=${start1.status}`);
  const way = await req('GET', `/service-requests/${srId}`, { token: technicianToken });
  log('status=on_the_way', way.json.data.status === 'on_the_way', way.json.data.status);
  const start = await req('POST', `/service-requests/${srId}/start`, { token: technicianToken });
  log('technician start #2 (->in_progress)', start.status === 200, `status=${start.status}`);
  const started = await req('GET', `/service-requests/${srId}`, { token: technicianToken });
  log('status=in_progress', started.json.data.status === 'in_progress', started.json.data.status);
  const complete = await req('POST', `/service-requests/${srId}/complete`, { token: technicianToken });
  log('technician complete', complete.status === 200, `status=${complete.status}`);
  const done = await req('GET', `/service-requests/${srId}`, { token: customerToken });
  log('status=completed', done.json.data.status === 'completed', done.json.data.status);

  // ---- review
  const review = await req('POST', `/service-requests/${srId}/review`, {
    token: customerToken,
    body: { rating: 5, comment: 'QA-run: excellent fast service' },
  });
  log('customer review', review.status === 201 || review.status === 200, `status=${review.status}`);
  const reviews = await req('GET', `/technicians/${tech.id}/reviews`);
  log('technician reviews visible', reviews.status === 200 && (reviews.json.data || []).length >= 1, `count=${(reviews.json.data || []).length}`);
  const stats = await req('GET', '/technician/stats', { token: technicianToken });
  log('technician stats', stats.status === 200, JSON.stringify(stats.json.data || {}).slice(0, 120));

  // ---- cancel path
  const create2 = await req('POST', '/service-requests', {
    token: customerToken,
    body: {
      technician_id: tech.id,
      appliance_category_id: cat.id,
      problem_description: 'QA second request for cancel path',
      location_id: loc.id,
    },
  });
  const sr2 = create2.json.data.id;
  const cancel = await req('POST', `/service-requests/${sr2}/cancel`, { token: customerToken });
  log('customer cancel', cancel.status === 200, `status=${cancel.status}`);
  const cancelled = await req('GET', `/service-requests/${sr2}`, { token: customerToken });
  log('status=cancelled', cancelled.json.data.status === 'cancelled', cancelled.json.data.status);

  // ---- invalid transition: cancel a completed request
  const badCancel = await req('POST', `/service-requests/${srId}/cancel`, { token: customerToken });
  log('cancel completed rejected (4xx)', badCancel.status >= 400 && badCancel.status < 500, `status=${badCancel.status}`);

  // ---- technician self-service
  const tprof = await req('GET', '/technician/profile', { token: technicianToken });
  log('technician profile', tprof.status === 200 && tprof.json.data.id, '');
  const tservices = await req('GET', '/technician/services', { token: technicianToken });
  log('technician services list', tservices.status === 200, `count=${(tservices.json.data || []).length}`);
  const tstats2 = await req('GET', '/technician/stats', { token: technicianToken });
  log('technician stats ok', tstats2.status === 200, '');

  // ---- merchant surface
  const mprof = await req('GET', '/merchant/profile', { token: merchantToken });
  log('merchant profile', mprof.status === 200, mprof.json.data && mprof.json.data.verificationStatus);
  const products = await req('GET', '/merchant/products', { token: merchantToken });
  log('merchant products list', products.status === 200, `count=${(products.json.data || []).length}`);
  const plans = await req('GET', '/subscription-plans', { token: customerToken });
  log('subscription plans role-scoped', plans.status === 200 && (plans.json.data || []).length >= 1, `count=${(plans.json.data || []).length}`);
  const merchantPlans = await req('GET', '/subscription-plans', { token: merchantToken });
  log('merchant sees no customer plans', merchantPlans.status === 200 && (merchantPlans.json.data || []).length === 0, `count=${(merchantPlans.json.data || []).length}`);
  const msub = await req('GET', '/merchant/subscription/current', { token: merchantToken });
  log('merchant subscription current', msub.status === 200 || msub.status === 404, `status=${msub.status}`);
  const payCfg = await req('GET', '/payments/config', { token: customerToken });
  log('payments config (auth)', payCfg.status === 200 && (payCfg.json.data || []).length >= 1, `methods=${(payCfg.json.data || []).length}`);

  // ---- notifications
  const notifC = await req('GET', '/notifications', { token: customerToken });
  log('customer notifications', notifC.status === 200, `count=${(notifC.json.data || []).length}`);
  const notifT = await req('GET', '/notifications', { token: technicianToken });
  log('technician notifications', notifT.status === 200, `count=${(notifT.json.data || []).length}`);

  // ---- summary
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} PASS ===`);
  if (failed.length) {
    console.log('FAILURES:');
    failed.forEach((f) => console.log(` - ${f.name} (${f.extra})`));
    process.exitCode = 1;
  }
  await fetch(`${BASE}/health`).catch(() => {});
}

main().catch((e) => {
  console.error('QA RUN CRASHED:', e.message);
  process.exit(1);
});
