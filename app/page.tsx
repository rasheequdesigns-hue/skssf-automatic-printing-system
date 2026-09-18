import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 text-center">
          SKSSF Automatic Printing System
        </h1>
        <p className="text-gray-500 text-center">
          Select a section to get started.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/kiosk"
            className="w-full text-center bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
          >
            Kiosk
          </Link>
          <Link
            href="/print"
            className="w-full text-center bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Print
          </Link>
          <Link
            href="/admin"
            className="w-full text-center bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
