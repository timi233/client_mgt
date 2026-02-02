export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Pury CRM
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          欢迎来到客户关系管理系统
        </p>
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          登录系统
        </a>
      </div>
    </main>
  );
}
