import TechnicianMessagesScreen from '../../src/features/technician/messages/technician-messages-screen';

/**
 * Route entry: Technician Messages (T-G). Conversation list composed
 * from the technician's assigned requests; opening a row launches the
 * shared chat dialog in the technician role. Presentation lives in the
 * feature folder behind `useTechnicianMessagesViewModel`.
 */
export default function TechnicianMessagesRoute() {
  return <TechnicianMessagesScreen />;
}
