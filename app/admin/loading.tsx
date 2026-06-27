export default function AdminLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  );
}
