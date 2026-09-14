export function GET() {
  return Response.json({
    service: 'Sharco Guard Cloud',
    status: 'operational',
    agentRequiredForDeviceScanning: true
  });
}
