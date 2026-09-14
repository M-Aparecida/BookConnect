import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Star, 
  Heart, 
  MessageCircle, 
  MessageSquare, 
  User, 
  PlusCircle, 
  TrendingUp 
} from 'lucide-react';

// Tipos baseados na especificação do projeto BookConnect
interface Book {
  id: string;
  titulo: string;
  autor: string;
  genero: string;
  urlCapa: string;
  notaMedia: number;
  totalResenhas: number;
}

interface Review {
  id: string;
  livroTitulo: string;
  livroCapa: string;
  autorResenha: string;
  avatarAutor: string;
  nota: number;
  texto: string;
  curtidas: number;
  comentarios: number;
  dataCriacao: string;
}

const mockBooks: Book[] = [
  {
    id: '1',
    titulo: 'Dom Casmurro',
    autor: 'Machado de Assis',
    genero: 'Romance Clássico',
    urlCapa: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop',
    notaMedia: 4.8,
    totalResenhas: 128
  },
  {
    id: '2',
    titulo: 'O Alquimista',
    autor: 'Paulo Coelho',
    genero: 'Ficção',
    urlCapa: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=400&auto=format&fit=crop',
    notaMedia: 4.5,
    totalResenhas: 95
  },
  {
    id: '3',
    titulo: '1984',
    autor: 'George Orwell',
    genero: 'Distopia',
    urlCapa: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400&auto=format&fit=crop',
    notaMedia: 4.9,
    totalResenhas: 210
  }
];

const mockReviews: Review[] = [
  {
    id: '101',
    livroTitulo: '1984',
    livroCapa: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400&auto=format&fit=crop',
    autorResenha: 'Maria Aparecida',
    avatarAutor: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
    nota: 5,
    texto: 'Uma leitura extremamente necessária e atual. A construção do universo e a densidade psicológica dos personagens são impressionantes!',
    curtidas: 24,
    comentarios: 5,
    dataCriacao: 'Há 2 horas'
  },
  {
    id: '102',
    livroTitulo: 'Dom Casmurro',
    livroCapa: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop',
    autorResenha: 'Breno Silva',
    avatarAutor: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
    nota: 4,
    texto: 'A ambiguidade da narrativa de Bentinho torna este clássico inesgotável. Sempre uma nova perspectiva a cada releitura.',
    curtidas: 18,
    comentarios: 3,
    dataCriacao: 'Há 5 horas'
  }
];

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header / Navegação */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              BookConnect
            </span>
          </div>

          {/* Barra de Busca de Livros */}
          <div className="flex-1 max-w-md relative hidden sm:block">
            <input
              type="text"
              placeholder="Pesquisar livros por título, autor ou ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          </div>

          {/* Ações de Usuário */}
          <div className="flex items-center space-x-3">
            <button className="hidden md:flex items-center space-x-1 text-sm font-medium text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md transition">
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar Livro</span>
            </button>
            <button className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition relative">
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <button className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition shadow-sm">
              <User className="w-4 h-4" />
              <span>Entrar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-50/50 to-transparent py-12 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Conecte-se com leitores, compartilhe opiniões e descubra sua próxima leitura.
            </h1>
            <p className="mt-4 text-base text-slate-600">
              O BookConnect é a sua rede social de livros. Catalogue suas leituras, escreva resenhas e converse diretamente com a comunidade.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start">
              <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow">
                Criar Conta Gratuita
              </button>
              <button className="bg-white text-slate-700 border border-slate-300 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition">
                Explorar Catálogo
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
            {mockBooks.map((book) => (
              <img
                key={book.id}
                src={book.urlCapa}
                alt={book.titulo}
                className="w-24 h-36 object-cover rounded-md shadow hover:scale-105 transition duration-200"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Seção da Esquerda/Centro: Feed de Resenhas (2 Colunas no desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Resenhas Recentes da Comunidade
            </h2>
          </div>

          <div className="space-y-4">
            {mockReviews.map((review) => (
              <article key={review.id} className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
                {/* Cabeçalho da Resenha */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={review.avatarAutor}
                      alt={review.autorResenha}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{review.autorResenha}</h4>
                      <p className="text-xs text-slate-400">{review.dataCriacao}</p>
                    </div>
                  </div>
                  {/* Avaliação em Estrelas */}
                  <div className="flex items-center space-x-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-700">{review.nota}.0</span>
                  </div>
                </div>

                {/* Conteúdo do Livro + Texto */}
                <div className="flex gap-4">
                  <img
                    src={review.livroCapa}
                    alt={review.livroTitulo}
                    className="w-16 h-24 object-cover rounded-md flex-shrink-0 shadow-sm"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-base mb-1">
                      Resenha de <span className="text-indigo-600">{review.livroTitulo}</span>
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                      "{review.texto}"
                    </p>
                  </div>
                </div>

                {/* Rodapé da Resenha / Interações */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-6 text-xs text-slate-500">
                  <button className="flex items-center space-x-1.5 hover:text-rose-600 transition">
                    <Heart className="w-4 h-4" />
                    <span>{review.curtidas} Curtidas</span>
                  </button>
                  <button className="flex items-center space-x-1.5 hover:text-indigo-600 transition">
                    <MessageCircle className="w-4 h-4" />
                    <span>{review.comentarios} Comentários</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Seção da Direita: Livros Em Destaque (1 Coluna no desktop) */}
        <aside className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Livros Populares
            </h3>
            <div className="space-y-4">
              {mockBooks.map((book) => (
                <div key={book.id} className="flex items-center space-x-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <img
                    src={book.urlCapa}
                    alt={book.titulo}
                    className="w-12 h-16 object-cover rounded shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 truncate">{book.titulo}</h4>
                    <p className="text-xs text-slate-500 truncate">{book.autor}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-slate-700">{book.notaMedia}</span>
                      <span className="text-xs text-slate-400">({book.totalResenhas})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>© 2026 BookConnect — Plataforma de Leitores e Resenhas. Desenvolvido para a disciplina de Programação Web.</p>
        </div>
      </footer>
    </div>
  );
}