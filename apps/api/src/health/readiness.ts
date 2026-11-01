export const RUNTIME_ROLE_SQL = `
  SELECT
    current_user AS "currentUser",
    pg_get_userbyid(c.relowner) AS "usersOwner",
    c.relrowsecurity AS "usersRls",
    c.relforcerowsecurity AS "usersForceRls",
    r.rolbypassrls AS "bypassRls",
    r.rolsuper AS "isSuperuser",
    has_table_privilege(current_user, 'public.users', 'SELECT') AS "canSelect"
  FROM pg_class c
  JOIN pg_roles r ON r.rolname = current_user
  WHERE c.relname = 'users'
    AND c.relnamespace = 'public'::regnamespace
`;

export interface RuntimeRoleState {
  currentUser: string;
  usersOwner: string;
  usersRls: boolean;
  usersForceRls: boolean;
  bypassRls: boolean;
  isSuperuser: boolean;
  canSelect: boolean;
}

/**
 * RLS is enabled on the public schema with no permissive policies. The
 * accepted runtime contract is therefore: the role owns the tables (without
 * FORCE RLS), has BYPASSRLS, or is a superuser. A role without one of those
 * properties would see zero rows while a plain count query still succeeds,
 * which is exactly the misleading readiness state this check rejects.
 *
 * Returns null when the runtime role is acceptable, otherwise a safe reason.
 */
export function assessRuntimeRole(row: RuntimeRoleState | undefined): string | null {
  if (row === undefined) {
    return 'could not resolve the runtime role against public.users';
  }
  if (!row.canSelect) {
    return 'runtime role cannot SELECT public.users';
  }
  const ownsUsers = row.usersOwner === row.currentUser;
  const bypassesRls = row.isSuperuser || row.bypassRls || (ownsUsers && !row.usersForceRls);
  if (row.usersRls && !bypassesRls) {
    return 'RLS is enabled on public.users and the runtime role is not the owner/BYPASSRLS';
  }
  return null;
}
