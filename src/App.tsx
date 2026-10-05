import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  LogIn,
  Star,
  Plus,
  Heart,
  ArrowLeft,
  BookPlus,
  Send,
  LogOut,
  Camera,
  Trash2,
  Lock,
  MessageSquare,
  Loader2,
} from 'lucide-react';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
// ==========================================
// 1. TIPOS E INTERFACES
// ==========================================
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  rating: number;
  description: string;
}

export interface Review {
  id: string;
  bookId: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isMine?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

// ==========================================
// 2. FUNÇÃO DE CONEXÃO COM A API (GOOGLE BOOKS + OPEN LIBRARY FALLBACK)
// ==========================================
async function searchBooksApi(query: string): Promise<Book[]> {
  if (!query.trim()) return [];

  // Tenta conectar à API do Google Books
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items.map((item: any) => {
          const info = item.volumeInfo;
          const rawThumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
          const coverUrl = rawThumbnail
            ? rawThumbnail.replace('http://', 'https://')
            : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80';

          return {
            id: item.id,
            title: info.title || 'Título indisponível',
            author: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
            rating: info.averageRating || 4.5,
            coverUrl: coverUrl,
            description: info.description || 'Nenhuma descrição disponível para este livro.',
          };
        });
      }
    }
  } catch (error) {
    console.warn('Falha no endpoint do Google Books API. Iniciando busca alternativa...', error);
  }

  // Fallback para Open Library API
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6`
    );
    const data = await response.json();

    if (data.docs && data.docs.length > 0) {
      return data.docs.map((doc: any, index: number) => {
        const coverId = doc.cover_i;
        const coverUrl = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80';

        return {
          id: doc.key || `openlib-${index}`,
          title: doc.title || 'Título indisponível',
          author: doc.author_name ? doc.author_name.join(', ') : 'Autor desconhecido',
          rating: 4.5,
          coverUrl: coverUrl,
          description: doc.first_sentence?.[0] || 'Nenhuma descrição disponível para este livro.',
        };
      });
    }
  } catch (error) {
    console.error('Erro ao comunicar com o serviço de busca de livros:', error);
  }

  return [];
}

// ==========================================
// 3. DADOS MOCKADOS INICIAIS DA APLICAÇÃO
// ==========================================
const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    rating: 4.8,
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
    description: 'Um clássico da literatura brasileira centrado na narração ambígua de Bento Santiago sobre Capitu.',
  },
  {
    id: '2',
    title: 'Orgulho e Preconceito',
    author: 'Jane Austen',
    rating: 4.7,
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&auto=format&fit=crop&q=80',
    description: 'A história do turbulento relacionamento entre Elizabeth Bennet e Fitzwilliam Darcy na Inglaterra do século XIX.',
  },
  {
    id: '3',
    title: 'O Alienista',
    author: 'Machado de Assis',
    rating: 4.6,
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&auto=format&fit=crop&q=80',
    description: 'Uma sátira afiada sobre a ciência, a loucura e o poder através da jornada do Doutor Simão Bacamarte.',
  },
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'r1',
    bookId: '1',
    authorName: 'Ana Clara',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    content: 'A escrita de Machado é incomparável. A dúvida sobre Capitu é mantida com perfeição até as últimas linhas.',
    likesCount: 14,
    commentsCount: 2,
    createdAt: '12 de Out, 2025',
    isMine: false,
  },
  {
    id: 'r2',
    bookId: '2',
    authorName: 'Lucas Silva',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    content: 'Uma crítica genial aos costumes da época com diálogos incrivelmente sagazes e cativantes.',
    likesCount: 8,
    commentsCount: 1,
    createdAt: '15 de Out, 2025',
    isMine: false,
  },
];

// ==========================================
// 4. COMPONENTE AUXILIAR (ESTRELAS DE AVALIAÇÃO)
// ==========================================
interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  onSelect?: (rating: number) => void;
  interactive?: boolean;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  onSelect,
  interactive = false,
}) => {
  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: maxRating }).map((_, idx) => {
        const starValue = idx + 1;
        const isFilled = starValue <= rating;
        return (
          <button
            key={idx}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onSelect && onSelect(starValue)}
            className={`${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                isFilled ? 'text-amber-700 fill-amber-700' : 'text-stone-300 fill-transparent'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

// ==========================================
// 5. APLICAÇÃO PRINCIPAL (APP)
// ==========================================
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState({
    name: 'Maria',
    email: 'leitor@bookconnect.com',
    bio: 'Apaixonada por clássicos da literatura e ficção histórica.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  });

  const [activePage, setActivePage] = useState<string>('catalog');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);

  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState<Book[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { id: '1', senderId: 'other', text: 'Olá! Vi que leu Dom Casmurro. O que achou do final?', timestamp: '14:20', isMe: false },
    { id: '2', senderId: 'me', text: 'Oi! Achei fantástico. A ambiguidade torna a leitura incrível.', timestamp: '14:22', isMe: true },
  ]);

  const handleAddBookFromApi = (bookToAdd: Book) => {
    if (!books.find((b) => b.id === bookToAdd.id)) {
      setBooks([bookToAdd, ...books]);
    }
    setActivePage('catalog');
  };

  const handleAddReview = (bookId: string, rating: number, content: string) => {
    const newRev: Review = {
      id: Date.now().toString(),
      bookId,
      authorName: userProfile.name,
      authorAvatar: userProfile.avatarUrl,
      rating,
      content,
      likesCount: 0,
      commentsCount: 0,
      createdAt: 'Hoje',
      isMine: true,
    };
    setReviews([newRev, ...reviews]);
  };

  const handleDeleteReview = (reviewId: string) => {
    setReviews(reviews.filter((r) => r.id !== reviewId));
  };

  const handleToggleLike = (reviewId: string) => {
    if (!isAuthenticated) return;
    setReviews(
      reviews.map((r) => (r.id === reviewId ? { ...r, likesCount: r.likesCount + 1 } : r))
    );
  };

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-800 font-sans selection:bg-amber-100 flex flex-col">
      <header className="border-b border-stone-200 bg-stone-50/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => {
              setSelectedBook(null);
              setActivePage('catalog');
            }}
          >
            <BookOpen className="w-6 h-6 text-amber-900" />
            <span className="font-serif text-xl tracking-wide font-bold text-stone-900">
              BookConnect
            </span>
          </div>

          <nav className="flex items-center space-x-6 text-sm font-medium text-stone-600">
            <button
              onClick={() => {
                setSelectedBook(null);
                setActivePage('catalog');
              }}
              className={`hover:text-stone-900 transition-colors ${
                activePage === 'catalog' ? 'text-amber-900 font-bold border-b-2 border-amber-900 pb-0.5' : ''
              }`}
            >
              Catálogo & Resenhas
            </button>

            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setSelectedBook(null);
                    setActivePage('add-book');
                  }}
                  className={`hover:text-stone-900 transition-colors ${
                    activePage === 'add-book' ? 'text-amber-900 font-bold border-b-2 border-amber-900 pb-0.5' : ''
                  }`}
                >
                  Adicionar Livro
                </button>
                <button
                  onClick={() => {
                    setSelectedBook(null);
                    setActivePage('chat');
                  }}
                  className={`flex items-center space-x-1 hover:text-stone-900 transition-colors ${
                    activePage === 'chat' ? 'text-amber-900 font-bold border-b-2 border-amber-900 pb-0.5' : ''
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Mensagens</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedBook(null);
                    setActivePage('profile');
                  }}
                  className="flex items-center space-x-2 border border-stone-300 bg-white rounded-full pl-1.5 pr-3 py-1 hover:bg-stone-50 transition-colors shadow-xs"
                >
                  <img
                    src={userProfile.avatarUrl}
                    alt="Perfil"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="text-xs text-stone-800 font-semibold">{userProfile.name}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Botão de login tradicional que você já tinha */}
                <button
                  onClick={() => setIsAuthenticated(true)}
                  className="flex items-center space-x-1.5 bg-amber-900 text-amber-50 px-4 py-1.5 rounded hover:bg-amber-950 transition-colors text-xs tracking-wide shadow-xs font-semibold"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Entrar no Sistema</span>
                </button>

                {/* NOVO: Botão de Login do Google */}
                <GoogleOAuthProvider clientId="COLE_SEU_CLIENT_ID_AQUI">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => {
                      // Isso vai imprimir o JWT no console para o seu print!
                      console.log("=== LOGIN GOOGLE REALIZADO COM SUCESSO ===");
                      console.log("Token JWT gerado:", credentialResponse.credential);
                      
                      // Autentica o usuário na sua aplicação React após o sucesso
                      setIsAuthenticated(true); 
                    }}
                    onError={() => {
                      console.log('Falha no login com o Google');
                    }}
                  />
                </GoogleOAuthProvider>
              </div>
            )}

            <button
              onClick={() => {
                setIsAuthenticated(!isAuthenticated);
                setSelectedBook(null);
                setActivePage('catalog');
              }}
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded transition-colors"
              title="Clique para alternar rapidamente entre Visitante e Usuário Autenticado"
            >
              Modo: {isAuthenticated ? 'Leitor' : 'Visitante'}
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {selectedBook ? (
          <BookDetailView
            book={selectedBook}
            isAuthenticated={isAuthenticated}
            reviews={reviews.filter((r) => r.bookId === selectedBook.id)}
            onBack={() => setSelectedBook(null)}
            onAddReview={(rating, text) => handleAddReview(selectedBook.id, rating, text)}
            onDeleteReview={handleDeleteReview}
            onToggleLike={handleToggleLike}
            onRequireAuth={() => setIsAuthenticated(true)}
          />
        ) : (
          <>
            {activePage === 'catalog' && (
              <CatalogView
                books={books}
                reviews={reviews}
                isAuthenticated={isAuthenticated}
                onSelectBook={(book) => setSelectedBook(book)}
                onAddBookClick={() => setActivePage('add-book')}
                onToggleLike={handleToggleLike}
              />
            )}

            {activePage === 'add-book' && (
              <AddBookView
                query={apiSearchQuery}
                setQuery={setApiSearchQuery}
                results={apiSearchResults}
                setResults={setApiSearchResults}
                onAddBook={handleAddBookFromApi}
              />
            )}

            {activePage === 'chat' && (
              <ChatView
                messages={chatMessages}
                onSendMessage={(text) => {
                  setChatMessages([
                    ...chatMessages,
                    { id: Date.now().toString(), senderId: 'me', text, timestamp: 'Agora', isMe: true },
                  ]);
                }}
              />
            )}

            {activePage === 'profile' && (
              <ProfileView
                profile={userProfile}
                onUpdateProfile={(updated) => setUserProfile({ ...userProfile, ...updated })}
                onLogout={() => {
                  setIsAuthenticated(false);
                  setActivePage('catalog');
                }}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-stone-50 py-6 text-center text-xs text-stone-500 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-serif italic">BookConnect © {new Date().getFullYear()} — Compartilhando leituras e perspectivas.</p>
          <div className="space-x-4">
            <span>{books.length} Obras Catalogadas</span>
            <span>•</span>
            <span>{reviews.length} Resenhas Publicadas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// 6. VIEWS E COMPONENTES
// ==========================================

function CatalogView({
  books,
  reviews,
  isAuthenticated,
  onSelectBook,
  onAddBookClick,
  onToggleLike,
}: {
  books: Book[];
  reviews: Review[];
  isAuthenticated: boolean;
  onSelectBook: (book: Book) => void;
  onAddBookClick: () => void;
  onToggleLike: (reviewId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <section className="text-center py-10 border border-stone-200/80 bg-white/70 rounded-lg p-6 shadow-xs">
        <h1 className="font-serif text-4xl text-stone-900 font-bold mb-3">
          Sua Biblioteca Coletiva
        </h1>
        <p className="text-stone-600 max-w-lg mx-auto text-sm italic font-serif leading-relaxed">
          "Um livro é um dispositivo para acender a imaginação." Explore obras, acompanhe a média das opiniões e converse com outros leitores.
        </p>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900">Acervo em Destaque</h2>
            <p className="text-xs text-stone-500">
              {isAuthenticated
                ? 'Selecione uma obra ou adicione novos livros ao catálogo'
                : 'Explore o acervo completo de forma anônima'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por título ou autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded bg-white text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:border-amber-800"
              />
            </div>

            {isAuthenticated && (
              <button
                onClick={onAddBookClick}
                className="flex items-center space-x-2 bg-amber-900 text-amber-50 px-4 py-2 rounded text-sm hover:bg-amber-950 transition-colors shadow-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Livro</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => onSelectBook(book)}
              className="bg-white border border-stone-200 rounded overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between group"
            >
              <div className="p-4 flex flex-col items-center">
                <div className="overflow-hidden rounded shadow-sm mb-4">
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-32 h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-serif font-bold text-stone-900 text-center text-lg leading-tight">
                  {book.title}
                </h3>
                <p className="text-xs text-stone-500 mt-1">{book.author}</p>
              </div>

              <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between">
                <RatingStars rating={Math.round(book.rating)} />
                <span className="text-xs font-semibold text-stone-600">
                  {book.rating.toFixed(1)} / 5
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-6 border-t border-stone-200">
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-bold text-stone-900">Resenhas da Comunidade</h2>
          <p className="text-xs text-stone-500">Últimas opiniões e análises publicadas pelos leitores</p>
        </div>

        {reviews.length === 0 ? (
          <p className="text-xs text-stone-500 italic">Nenhuma resenha publicada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => {
              const reviewedBook = books.find((b) => b.id === rev.bookId);
              return (
                <div
                  key={rev.id}
                  className="bg-white border border-stone-200 rounded p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {reviewedBook && (
                      <div
                        onClick={() => onSelectBook(reviewedBook)}
                        className="flex items-center space-x-3 p-2 bg-stone-50 rounded border border-stone-100 cursor-pointer hover:bg-stone-100/80 transition-colors"
                      >
                        <img
                          src={reviewedBook.coverUrl}
                          alt={reviewedBook.title}
                          className="w-8 h-12 object-cover rounded shadow-2xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-serif font-bold text-stone-900 truncate">
                            {reviewedBook.title}
                          </p>
                          <p className="text-[10px] text-stone-500 truncate">{reviewedBook.author}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={rev.authorAvatar}
                          alt={rev.authorName}
                          className="w-8 h-8 rounded-full object-cover border border-stone-200"
                        />
                        <div>
                          <h4 className="text-xs font-semibold text-stone-800">{rev.authorName}</h4>
                          <span className="text-[10px] text-stone-400">{rev.createdAt}</span>
                        </div>
                      </div>
                      <RatingStars rating={rev.rating} />
                    </div>

                    <p className="text-stone-700 text-sm italic font-serif leading-relaxed">
                      "{rev.content}"
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 pt-3 border-t border-stone-100 text-stone-500 text-xs">
                    <button
                      onClick={() => onToggleLike(rev.id)}
                      title={!isAuthenticated ? 'Faça login para curtir' : ''}
                      className={`flex items-center space-x-1 transition-colors ${
                        isAuthenticated ? 'hover:text-amber-800' : 'cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>{rev.likesCount} Curtidas</span>
                    </button>
                    <span className="flex items-center space-x-1 opacity-70">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{rev.commentsCount} Comentários</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function BookDetailView({
  book,
  isAuthenticated,
  reviews,
  onBack,
  onAddReview,
  onDeleteReview,
  onToggleLike,
  onRequireAuth,
}: {
  book: Book;
  isAuthenticated: boolean;
  reviews: Review[];
  onBack: () => void;
  onAddReview: (rating: number, text: string) => void;
  onDeleteReview: (id: string) => void;
  onToggleLike: (id: string) => void;
  onRequireAuth: () => void;
}) {
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    onAddReview(rating, reviewText);
    setReviewText('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center space-x-1 text-xs text-stone-500 hover:text-stone-800 mb-6 group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Voltar ao catálogo</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-stone-200">
        <div className="flex justify-center">
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-48 h-72 object-cover rounded shadow-md border border-stone-200"
          />
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-stone-900">{book.title}</h1>
            <p className="text-stone-600 font-serif italic text-base">por {book.author}</p>
          </div>

          <div className="flex items-center space-x-3">
            <RatingStars rating={Math.round(book.rating)} />
            <span className="text-sm font-semibold text-stone-700">
              {book.rating.toFixed(1)} de 5
            </span>
          </div>

          <p className="text-stone-700 text-sm leading-relaxed bg-white p-4 rounded border border-stone-200/60 shadow-2xs">
            {book.description}
          </p>
        </div>
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="my-8 bg-stone-50 border border-stone-200 rounded p-6 shadow-xs">
          <h3 className="font-serif font-bold text-lg text-stone-900 mb-3">
            Escrever uma Resenha
          </h3>
          <div className="mb-4">
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Sua Nota para esta leitura:
            </label>
            <RatingStars rating={rating} interactive onSelect={(r) => setRating(r)} />
          </div>
          <textarea
            rows={4}
            placeholder="Compartilhe suas impressões com outros leitores..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="w-full p-3 border border-stone-300 rounded bg-white text-stone-800 text-sm focus:outline-none focus:border-amber-800 mb-3"
          />
          <button
            type="submit"
            className="bg-amber-900 text-amber-50 px-4 py-2 rounded text-xs font-semibold hover:bg-amber-950 transition-colors cursor-pointer"
          >
            Publicar Resenha
          </button>
        </form>
      ) : (
        <div className="my-8 p-6 bg-amber-50/80 border border-amber-200 rounded text-center flex flex-col items-center space-y-3">
          <div className="flex items-center space-x-2 text-amber-900 font-serif font-bold">
            <Lock className="w-4 h-4" />
            <span>Quer publicar sua opinião sobre este livro?</span>
          </div>
          <p className="text-xs text-amber-800 max-w-md">
            Como visitante, você pode ler todas as resenhas e avaliações. Crie uma conta ou entre no sistema para publicar resenhas, curtir e interagir com a comunidade.
          </p>
          <button
            onClick={onRequireAuth}
            className="bg-amber-900 text-amber-50 px-4 py-2 rounded text-xs font-semibold hover:bg-amber-950 transition-colors cursor-pointer"
          >
            Entrar ou Criar Conta
          </button>
        </div>
      )}

      <section className="space-y-6">
        <h3 className="font-serif font-bold text-xl text-stone-900">
          Resenhas dos Leitores ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <p className="text-xs text-stone-500 italic">Nenhuma resenha cadastrada para este livro ainda.</p>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="border border-stone-200 rounded p-5 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={rev.authorAvatar}
                    alt={rev.authorName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                      <span>{rev.authorName}</span>
                      {rev.isMine && (
                        <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-sans">Sua resenha</span>
                      )}
                    </h4>
                    <span className="text-[10px] text-stone-400">{rev.createdAt}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <RatingStars rating={rev.rating} />
                  {isAuthenticated && rev.isMine && (
                    <button
                      onClick={() => onDeleteReview(rev.id)}
                      className="text-stone-400 hover:text-red-700 transition-colors p-1 cursor-pointer"
                      title="Excluir minha resenha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-stone-700 text-sm italic font-serif leading-relaxed">
                "{rev.content}"
              </p>

              <div className="flex items-center space-x-4 pt-2 border-t border-stone-100 text-stone-500 text-xs">
                <button
                  onClick={() => onToggleLike(rev.id)}
                  title={!isAuthenticated ? 'Faça login para curtir' : ''}
                  className={`flex items-center space-x-1 transition-colors ${
                    isAuthenticated ? 'hover:text-amber-800 cursor-pointer' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>{rev.likesCount} Curtidas</span>
                </button>
                <span className="flex items-center space-x-1 opacity-70">
                  <MessageSquare className="w-4 h-4" />
                  <span>{rev.commentsCount} Comentários</span>
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function AddBookView({
  query,
  setQuery,
  results,
  setResults,
  onAddBook,
}: {
  query: string;
  setQuery: (q: string) => void;
  results: Book[];
  setResults: (res: Book[]) => void;
  onAddBook: (book: Book) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const apiBooks = await searchBooksApi(query);
      setResults(apiBooks);
      if (apiBooks.length === 0) {
        setError('Nenhum livro foi encontrado na API para o termo pesquisado.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao consultar os serviços de busca de livros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold text-stone-900 mb-2">
        Adicionar Livro ao Acervo
      </h1>
      <p className="text-xs text-stone-500 mb-6">
        Busque pelo título ou autor para preenchimento automático das informações via API pública do Google Books.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Digite o título do livro (ex: Trono de vidro)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 p-2.5 border border-stone-300 rounded bg-white text-stone-800 text-sm focus:outline-none focus:border-amber-800"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-900 text-amber-50 px-4 py-2.5 rounded text-xs tracking-wide flex items-center space-x-2 hover:bg-amber-950 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>{loading ? 'Buscando...' : 'Pesquisar API'}</span>
        </button>
      </form>

      {error && (
        <div className="p-3 mb-6 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {results.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row items-center justify-between bg-white border border-stone-200 p-4 rounded gap-4 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <img
                src={item.coverUrl}
                alt={item.title}
                className="w-16 h-24 object-cover rounded shadow-xs"
              />
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-stone-900 text-base">{item.title}</h3>
                <p className="text-xs text-stone-500">{item.author}</p>
                <div className="flex items-center space-x-2 pt-1">
                  <RatingStars rating={Math.round(item.rating)} />
                  <span className="text-xs text-stone-600 font-semibold">{item.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onAddBook(item)}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-stone-900 text-white px-4 py-2 rounded text-xs hover:bg-stone-800 transition-colors cursor-pointer shadow-xs font-medium"
            >
              <BookPlus className="w-4 h-4" />
              <span>Adicionar ao Acervo</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatView({
  messages,
  onSendMessage,
}: {
  messages: Message[];
  onSendMessage: (text: string) => void;
}) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white border border-stone-200 rounded-lg shadow-xs overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-900 text-amber-50 rounded-full flex items-center justify-center font-bold text-xs">
              CB
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-800">Clube de Leitura - Geral</h2>
              <p className="text-[10px] text-stone-500">2 membros online</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-xs sm:max-w-md p-3 rounded-lg text-sm ${
                  msg.isMe
                    ? 'bg-amber-900 text-amber-50 rounded-br-none'
                    : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none shadow-2xs'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t border-stone-200 bg-white flex gap-2">
          <input
            type="text"
            placeholder="Digite sua mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 px-3 py-2 border border-stone-300 rounded text-sm text-stone-800 focus:outline-none focus:border-amber-800"
          />
          <button
            type="submit"
            className="bg-amber-900 text-amber-50 p-2 rounded hover:bg-amber-950 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileView({
  profile,
  onUpdateProfile,
  onLogout,
}: {
  profile: { name: string; email: string; bio: string; avatarUrl: string };
  onUpdateProfile: (updated: Partial<typeof profile>) => void;
  onLogout: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ name, bio });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt="Perfil"
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-900/20"
              />
              <button className="absolute bottom-0 right-0 bg-stone-900 text-white p-1 rounded-full text-xs shadow-xs hover:bg-stone-800 transition-colors">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-900">{profile.name}</h2>
              <p className="text-xs text-stone-500">{profile.email}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1 text-xs text-red-700 hover:text-red-800 transition-colors border border-red-200 bg-red-50 px-3 py-1.5 rounded cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nome de Exibição</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-stone-300 rounded text-sm text-stone-800 focus:outline-none focus:border-amber-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Biografia Literária</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-2 border border-stone-300 rounded text-sm text-stone-800 focus:outline-none focus:border-amber-800"
            />
          </div>

          <button
            type="submit"
            className="bg-amber-900 text-amber-50 px-4 py-2 rounded text-xs font-semibold hover:bg-amber-950 transition-colors cursor-pointer"
          >
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}