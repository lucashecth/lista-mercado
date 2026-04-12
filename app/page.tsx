import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      <h1 className="text-3xl font-bold mb-10 text-slate-800">Lista de Mercado</h1>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link 
          href="/lista" 
          className="bg-blue-600 text-white p-4 rounded-xl text-center font-semibold shadow-lg active:scale-95 transition-transform"
        >
          Minha Lista
        </Link>
        
        <Link 
          href="/mercado" 
          className="bg-green-600 text-white p-4 rounded-xl text-center font-semibold shadow-lg active:scale-95 transition-transform"
        >
          Estou no Mercado
        </Link>
      </div>
    </main>
  );
}