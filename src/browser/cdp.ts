// Placeholder for future CDP attach mode (Mode B)
// Will support connecting to a running Edge instance via --remote-debugging-port=9222

export async function connectCDP(_port: number = 9222): Promise<void> {
  throw new Error("CDP attach mode is not yet implemented. Use 'localpage login' for authenticated captures.");
}
