import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  MessageCircle,
  Heart,
  Star,
  User,
  LogIn,
  LogOut,
  Send,
  X,
  Edit3,
  Save,
} from 'lucide-react';

import {
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
  signOut,
} from 'aws-amplify/auth';

// --- MOCK DATA INICIAL ---
const MOCK_USERS = {
  u2: {
    id: 'u2',
    name: 'João Silva',
    avatar: '',
    bio: 'Fã de fantasia épica e sci-fi.',
  },
  u3: {
    id: 'u3',
    name: 'Carla Dias',
    avatar: '',
    bio: 'Leitora voraz. Amo distopias.',
  },
  u4: {
    id: 'u4',
    name: 'Marcos Paulo',
    avatar: '',
    bio: 'Devorador de clássicos.',
  },
};

const INITIAL_REVIEWS = [
  {
    id: 'r1',
    user: MOCK_USERS.u2,
    book: {
      id: 'b1',
      title: 'O Senhor dos Anéis',
      author: 'J.R.R. Tolkien',
      cover: 'https://covers.openlibrary.org/b/id/9251899-M.jpg',
    },
    rating: 5,
    text: 'Uma obra prima absoluta! A construção do mundo é incrível.',
    likedBy: ['u3'],
    comments: [
      {
        id: 'c1',
        user: MOCK_USERS.u3,
        text: 'Concordo plenamente! É o meu livro favorito.',
        likedBy: ['u2'],
        replies: [
          {
            id: 'rep1',
            user: MOCK_USERS.u2,
            text: 'Você leu os apêndices também?',
            likedBy: [],
          },
        ],
      },
    ],
    createdAt: new Date(Date.now() - 10000000).toISOString(),
  },
];

const INITIAL_CONTACTS = [
  {
    id: 'u2',
    name: 'João Silva',
    avatar: '',
    lastMessage: 'Você já leu Duna?',
  },
];

const INITIAL_MESSAGES = {
  u2: [
    {
      id: 'm1',
      senderId: 'u2',
      text: 'Oi! Vi sua resenha.',
      timestamp: '10:30',
    },
  ],
};

// --- COMPONENTES AUXILIARES ---
const RatingStars = ({
  rating,
  interactive = false,
  onRate,
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}) => {
  return (
    <div className="flex text-yellow-400">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={interactive ? 24 : 16}
          fill={star <= rating ? 'currentColor' : 'none'}
          className={`${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          } ${
            interactive
              ? 'cursor-pointer hover:scale-110 transition-transform'
              : ''
          }`}
          onClick={() => interactive && onRate && onRate(star)}
        />
      ))}
    </div>
  );
};

const AvatarDisplay = ({
  src,
  alt,
  className,
  onClick,
}: {
  src?: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'Avatar'}
        className={`object-cover ${className || ''}`}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold uppercase overflow-hidden shrink-0 ${
        className || ''
      }`}
    >
      {alt ? alt.charAt(0) : <User size={16} />}
    </div>
  );
};

// --- COMPONENTES PRINCIPAIS ---

// 1. HEADER
const Header = ({
  currentUser,
  currentView,
  setView,
  handleLogout,
  onUserClick,
}: {
  currentUser: any;
  currentView: string;
  setView: (view: string) => void;
  handleLogout: () => void;
  onUserClick: (user: any) => void;
}) => {
  const NavButton = ({
    view,
    icon: Icon,
    label,
  }: {
    view: string;
    icon: any;
    label: string;
  }) => (
    <button
      onClick={() => setView(view)}
      className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors ${
        currentView === view
          ? 'bg-indigo-100 text-indigo-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setView('feed')}
          >
            <BookOpen className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">
              BookConnect
            </span>
          </div>

          <nav className="hidden md:flex space-x-4">
            <NavButton view="feed" icon={BookOpen} label="Feed" />
            <NavButton view="search" icon={Search} label="Buscar Livros" />

            {currentUser && (
              <NavButton
                view="chat"
                icon={MessageCircle}
                label="Mensagens"
              />
            )}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <div
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md transition-colors"
                  onClick={() => onUserClick(currentUser)}
                >
                  <AvatarDisplay
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-600"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView('auth')}
                className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                <LogIn size={18} />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// 2. PERFIL
const ProfileView = ({
  profileUser,
  currentUser,
  onSaveProfile,
  onSendMessage,
  reviews,
  onBack,
}: {
  profileUser: any;
  currentUser: any;
  onSaveProfile: (user: any) => void;
  onSendMessage: (user: any) => void;
  reviews: any[];
  onBack: () => void;
}) => {
  const isOwnProfile = currentUser && currentUser.id === profileUser.id;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profileUser.name);
  const [bio, setBio] = useState(profileUser.bio || '');
  const [avatar, setAvatar] = useState(profileUser.avatar || '');

  const userReviews = reviews.filter(
    (review) => review.user.id === profileUser.id
  );

  const handleSave = () => {
    onSaveProfile({ ...profileUser, name, bio, avatar });
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setAvatar(String(reader.result || ''));
      };

      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 fade-in">
      <button
        onClick={onBack}
        className="text-indigo-600 mb-4 hover:underline flex items-center"
      >
        &larr; Voltar
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600" />

        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <AvatarDisplay
              src={isEditing ? avatar : profileUser.avatar}
              alt={profileUser.name}
              className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-sm text-4xl"
            />

            <div className="flex space-x-2">
              {isOwnProfile ? (
                isEditing ? (
                  <button
                    onClick={handleSave}
                    className="flex items-center space-x-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    <Save size={16} />
                    <span>Salvar</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 border border-gray-300"
                  >
                    <Edit3 size={16} />
                    <span>Editar Perfil</span>
                  </button>
                )
              ) : (
                currentUser && (
                  <button
                    onClick={() => onSendMessage(profileUser)}
                    className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    <MessageCircle size={16} />
                    <span>Enviar Mensagem</span>
                  </button>
                )
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto de Perfil
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 outline-none"
                />

                {avatar && (
                  <button
                    onClick={() => setAvatar('')}
                    className="text-xs text-red-500 mt-2 hover:underline"
                  >
                    Remover foto
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-gray-300 border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biografia
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full border-gray-300 border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Conte um pouco sobre você e o que gosta de ler..."
                />
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {profileUser.name}
              </h1>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">
                {profileUser.bio || 'Nenhuma biografia informada.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
        Resenhas de {profileUser.name.split(' ')[0]} ({userReviews.length})
      </h3>

      {userReviews.length === 0 ? (
        <p className="text-gray-500">
          Este usuário ainda não publicou nenhuma resenha.
        </p>
      ) : (
        <div className="space-y-4">
          {userReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white p-4 rounded-xl border border-gray-200 flex gap-4 items-start shadow-sm"
            >
              <img
                src={review.book.cover}
                alt="Capa"
                className="w-16 h-24 object-cover rounded shadow-sm"
              />

              <div>
                <h4 className="font-bold text-gray-900">
                  {review.book.title}
                </h4>
                <RatingStars rating={review.rating} />
                <p className="text-gray-700 mt-2 text-sm">
                  "{review.text}"
                </p>
                <span className="text-xs text-gray-400 mt-2 block">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 3. FEED E COMENTÁRIOS
const FeedView = ({
  currentUser,
  reviews,
  actions,
  onUserClick,
}: {
  currentUser: any;
  reviews: any[];
  actions: any;
  onUserClick: (user: any) => void;
}) => {
  const [activeCommentReview, setActiveCommentReview] = useState<string | null>(
    null
  );
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    reviewId: string;
    commentId: string;
  } | null>(null);
  const [replyText, setReplyText] = useState('');

  const submitComment = (reviewId: string) => {
    if (!commentText.trim()) return;

    actions.onAddComment(reviewId, commentText);
    setCommentText('');
  };

  const submitReply = (reviewId: string, commentId: string) => {
    if (!replyText.trim()) return;

    actions.onAddReply(reviewId, commentId, replyText);
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Feed da Comunidade
          </h2>

          <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 font-bold text-base block mb-0.5">
              ✨ Explore mundos infinitos.
            </span>
            Compartilhe suas resenhas, avalie suas obras favoritas e
            conecte-se com mentes apaixonadas por literatura! 📚☕
          </p>
        </div>

        {!currentUser && (
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap mt-2 sm:mt-0">
            Modo Visitante
          </span>
        )}
      </div>

      <div className="space-y-6">
        {reviews.map((review) => {
          const hasLikedReview =
            currentUser && review.likedBy.includes(currentUser.id);

          return (
            <div
              key={review.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-in"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="flex items-center space-x-3 cursor-pointer group"
                    onClick={() => onUserClick(review.user)}
                  >
                    <AvatarDisplay
                      src={review.user.avatar}
                      alt={review.user.name}
                      className="w-10 h-10 rounded-full group-hover:opacity-80 transition-opacity"
                    />

                    <div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {review.user.name}
                      </h4>
                      <span className="text-xs text-gray-500">
                        Avaliou um livro
                      </span>
                    </div>
                  </div>

                  <RatingStars rating={review.rating} />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4 bg-gray-50 p-3 rounded-lg">
                  <img
                    src={review.book.cover}
                    alt={review.book.title}
                    className="w-20 h-32 object-cover rounded shadow-sm flex-shrink-0 bg-white"
                  />

                  <div>
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">
                      {review.book.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      por {review.book.author}
                    </p>
                    <p className="text-gray-800 text-sm md:text-base italic">
                      "{review.text}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center pt-3 border-t border-gray-100 space-x-6">
                  <button
                    onClick={() => actions.onToggleLikeReview(review.id)}
                    disabled={!currentUser}
                    className={`flex items-center space-x-1.5 transition-colors ${
                      !currentUser
                        ? 'opacity-50 cursor-not-allowed'
                        : hasLikedReview
                        ? 'text-red-500'
                        : 'text-gray-500 hover:text-red-500'
                    }`}
                  >
                    <Heart
                      size={20}
                      fill={hasLikedReview ? 'currentColor' : 'none'}
                    />
                    <span className="font-medium text-sm">
                      {review.likedBy.length}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setActiveCommentReview(
                        activeCommentReview === review.id ? null : review.id
                      )
                    }
                    className="flex items-center space-x-1.5 text-gray-500 hover:text-indigo-500 transition-colors"
                  >
                    <MessageCircle size={20} />
                    <span className="font-medium text-sm">
                      {review.comments.length}
                    </span>
                  </button>
                </div>
              </div>

              {activeCommentReview === review.id && (
                <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                  <div className="space-y-4 mb-4">
                    {review.comments.map((comment: any) => {
                      const hasLikedComment =
                        currentUser &&
                        comment.likedBy.includes(currentUser.id);

                      const isReplying =
                        replyingTo?.commentId === comment.id;

                      return (
                        <div key={comment.id} className="text-sm">
                          <div className="flex items-start gap-2">
                            <AvatarDisplay
                              src={comment.user.avatar}
                              alt={comment.user.name}
                              className="w-8 h-8 rounded-full cursor-pointer"
                              onClick={() => onUserClick(comment.user)}
                            />

                            <div className="flex-1">
                              <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm inline-block min-w-full sm:min-w-[60%]">
                                <span
                                  className="font-semibold text-gray-900 cursor-pointer hover:underline"
                                  onClick={() => onUserClick(comment.user)}
                                >
                                  {comment.user.name}
                                </span>

                                <p className="text-gray-800 mt-0.5">
                                  {comment.text}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 mt-1 ml-1 text-xs text-gray-500 font-medium">
                                <button
                                  disabled={!currentUser}
                                  onClick={() =>
                                    actions.onToggleLikeComment(
                                      review.id,
                                      comment.id
                                    )
                                  }
                                  className={`${
                                    hasLikedComment
                                      ? 'text-red-500'
                                      : 'hover:text-gray-800'
                                  } ${!currentUser ? 'opacity-50' : ''}`}
                                >
                                  Curtir ({comment.likedBy.length})
                                </button>

                                <button
                                  disabled={!currentUser}
                                  onClick={() =>
                                    setReplyingTo({
                                      reviewId: review.id,
                                      commentId: comment.id,
                                    })
                                  }
                                  className={`hover:text-gray-800 ${
                                    !currentUser ? 'opacity-50' : ''
                                  }`}
                                >
                                  Responder
                                </button>
                              </div>

                              {comment.replies.length > 0 && (
                                <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                                  {comment.replies.map((reply: any) => {
                                    const hasLikedReply =
                                      currentUser &&
                                      reply.likedBy.includes(currentUser.id);

                                    return (
                                      <div
                                        key={reply.id}
                                        className="flex items-start gap-2"
                                      >
                                        <AvatarDisplay
                                          src={reply.user.avatar}
                                          alt={reply.user.name}
                                          className="w-6 h-6 rounded-full cursor-pointer text-[10px]"
                                          onClick={() =>
                                            onUserClick(reply.user)
                                          }
                                        />

                                        <div>
                                          <div className="bg-gray-100 p-2 rounded-lg border border-gray-200 inline-block">
                                            <span
                                              className="font-semibold text-gray-900 text-xs cursor-pointer hover:underline"
                                              onClick={() =>
                                                onUserClick(reply.user)
                                              }
                                            >
                                              {reply.user.name}
                                            </span>

                                            <p className="text-gray-800 mt-0.5">
                                              {reply.text}
                                            </p>
                                          </div>

                                          <div className="mt-1 ml-1 text-[11px] text-gray-500 font-medium">
                                            <button
                                              disabled={!currentUser}
                                              onClick={() =>
                                                actions.onToggleLikeReply(
                                                  review.id,
                                                  comment.id,
                                                  reply.id
                                                )
                                              }
                                              className={`${
                                                hasLikedReply
                                                  ? 'text-red-500'
                                                  : 'hover:text-gray-800'
                                              } ${
                                                !currentUser ? 'opacity-50' : ''
                                              }`}
                                            >
                                              Curtir ({reply.likedBy.length})
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {isReplying && (
                                <div className="mt-3 pl-4 flex gap-2">
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) =>
                                      setReplyText(e.target.value)
                                    }
                                    placeholder={`Respondendo a ${comment.user.name}...`}
                                    className="flex-1 text-sm rounded-full border-gray-300 px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white border shadow-sm"
                                  />

                                  <button
                                    onClick={() =>
                                      submitReply(review.id, comment.id)
                                    }
                                    className="bg-indigo-600 text-white rounded-full p-1.5 hover:bg-indigo-700"
                                  >
                                    <Send size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {currentUser ? (
                    <div className="flex gap-2 items-center mt-4">
                      <AvatarDisplay
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full"
                      />

                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escreva um comentário..."
                        className="flex-1 rounded-full border-gray-300 border px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm"
                        onKeyDown={(e) =>
                          e.key === 'Enter' && submitComment(review.id)
                        }
                      />

                      <button
                        onClick={() => submitComment(review.id)}
                        className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 shadow-sm"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-500 mt-4 bg-white p-2 rounded-md border border-gray-200">
                      Faça login para comentar.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 4. BUSCA E API OPEN LIBRARY
const SearchView = ({
  currentUser,
  onAddReview,
}: {
  currentUser: any;
  onAddReview: (review: any) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTerm.trim()) return;

    setIsSearching(true);

    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(
          searchTerm
        )}&limit=12`
      );

      const data = await res.json();

      const formattedResults = data.docs.map((book: any) => ({
        id: book.key,
        title: book.title,
        author: book.author_name
          ? book.author_name.join(', ')
          : 'Autor Desconhecido',
        isbn: book.isbn ? book.isbn[0] : 'N/A',
        cover: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
          : 'https://via.placeholder.com/150x220?text=Sem+Capa',
      }));

      setResults(formattedResults);
    } catch (error) {
      console.error('Erro na busca', error);
    } finally {
      setIsSearching(false);
    }
  };

  const submitReview = () => {
    if (rating === 0 || !reviewText.trim()) {
      alert('Preencha a nota e o texto!');
      return;
    }

    onAddReview({
      book: selectedBook,
      rating,
      text: reviewText,
    });

    setSelectedBook(null);
    setRating(0);
    setReviewText('');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Explorar Acervo (Open Library API)
      </h2>

      <form onSubmit={handleSearch} className="relative mb-8 shadow-sm flex">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-l-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Busque por título, autor... (Ex: Harry Potter)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <button
          type="submit"
          className="bg-indigo-600 text-white px-6 py-3 rounded-r-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Buscar
        </button>
      </form>

      {isSearching ? (
        <div className="text-center py-12 text-gray-500 font-medium">
          Consultando a biblioteca mundial...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
          {results.map((book) => (
            <div
              key={book.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="h-48 overflow-hidden bg-gray-100 flex justify-center py-2 relative">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="h-full object-contain shadow-sm"
                />
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h3
                  className="font-bold text-lg text-gray-900 line-clamp-1"
                  title={book.title}
                >
                  {book.title}
                </h3>

                <p className="text-sm text-gray-600 mb-4 flex-1">
                  {book.author}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-100">
                  <button
                    disabled={!currentUser}
                    onClick={() => setSelectedBook(book)}
                    className={`w-full py-2 rounded-md font-medium text-sm transition-colors ${
                      currentUser
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {currentUser
                      ? '+ Fazer Resenha'
                      : 'Faça login para avaliar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                Avaliar Livro
              </h3>

              <button
                onClick={() => setSelectedBook(null)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <img
                  src={selectedBook.cover}
                  alt={selectedBook.title}
                  className="w-16 h-24 object-cover rounded shadow-sm"
                />

                <div>
                  <h4 className="font-bold text-gray-900">
                    {selectedBook.title}
                  </h4>

                  <p className="text-sm text-gray-600">
                    {selectedBook.author}
                  </p>

                  <div className="mt-2">
                    <RatingStars
                      rating={rating}
                      interactive
                      onRate={setRating}
                    />
                  </div>
                </div>
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="O que você achou desta leitura?"
                className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />

              <button
                onClick={submitReview}
                className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Publicar Resenha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 5. CHAT
const ChatView = ({
  currentUser,
  activeChatUser,
}: {
  currentUser: any;
  activeChatUser: any;
}) => {
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [messages, setMessages] = useState<any>(INITIAL_MESSAGES);

  const [activeContact, setActiveContact] = useState<any>(null);
  const [inputMsg, setInputMsg] = useState('');

  useEffect(() => {
    if (activeChatUser) {
      if (!contacts.find((contact) => contact.id === activeChatUser.id)) {
        setContacts((prev) => [
          { ...activeChatUser, lastMessage: 'Nova conversa' },
          ...prev,
        ]);
      }

      setActiveContact(activeChatUser);
    } else if (!activeContact && contacts.length > 0) {
      setActiveContact(contacts[0]);
    }
  }, [activeChatUser]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMsg.trim() || !activeContact) return;

    const newMsg = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text: inputMsg,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev: any) => ({
      ...prev,
      [activeContact.id]: [
        ...(prev[activeContact.id] || []),
        newMsg,
      ],
    }));

    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === activeContact.id
          ? { ...contact, lastMessage: inputMsg }
          : contact
      )
    );

    setInputMsg('');
  };

  const activeMessages = activeContact
    ? messages[activeContact.id] || []
    : [];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 h-[calc(100vh-80px)] flex flex-col fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Mensagens Privadas
      </h2>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex h-full min-h-[400px]">
        <div className="w-1/3 md:w-1/4 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-3 border-b border-gray-200 font-semibold text-gray-700 bg-white">
            Contatos
          </div>

          <div className="overflow-y-auto flex-1">
            {contacts.map((contact: any) => (
              <div
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                className={`flex items-center p-3 cursor-pointer transition-colors border-l-4 ${
                  activeContact?.id === contact.id
                    ? 'bg-white border-indigo-500'
                    : 'border-transparent hover:bg-gray-100'
                }`}
              >
                <AvatarDisplay
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-10 h-10 rounded-full mr-3 shrink-0"
                />

                <div className="hidden sm:block overflow-hidden">
                  <p className="font-medium text-gray-900 truncate">
                    {contact.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {contact.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {activeContact ? (
          <div className="flex-1 flex flex-col bg-white relative">
            <div className="p-3 border-b border-gray-200 flex items-center shadow-sm z-10 bg-white">
              <AvatarDisplay
                src={activeContact.avatar}
                alt={activeContact.name}
                className="w-8 h-8 rounded-full mr-3 shrink-0"
              />
              <span className="font-semibold text-gray-900">
                {activeContact.name}
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-[#F9FAFB] space-y-4 flex flex-col">
              {activeMessages.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-sm">
                  Inicie uma conversa com {activeContact.name.split(' ')[0]}
                </div>
              ) : (
                activeMessages.map((msg: any) => {
                  const isMe = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <span
                          className={`text-[10px] block mt-1 text-right ${
                            isMe ? 'text-indigo-200' : 'text-gray-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-white border-t border-gray-200">
              <form onSubmit={handleSend} className="flex space-x-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-full px-4 py-2 text-sm outline-none transition-all"
                />

                <button
                  type="submit"
                  disabled={!inputMsg.trim()}
                  className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
            Selecione um contato para conversar.
          </div>
        )}
      </div>
    </div>
  );
};

// 6. AUTH — AMAZON COGNITO
const AuthView = ({
  error,
}: {
  error: string;
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleAuthentication = async () => {
    setIsRedirecting(true);

    try {
      await signInWithRedirect();
    } catch (error) {
      console.error('Erro ao iniciar autenticação Cognito:', error);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <BookOpen className="h-12 w-12 text-indigo-600 mx-auto" />

        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          {isLogin ? 'Acesso ao Sistema' : 'Crie sua conta'}
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          {isLogin
            ? 'Entre para interagir com a comunidade.'
            : 'Junte-se a leitores no BookConnect.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-10 shadow rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={handleAuthentication}
            disabled={isRedirecting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {isRedirecting
              ? 'Redirecionando...'
              : isLogin
              ? 'Entrar com Cognito'
              : 'Cadastrar com Cognito'}
          </button>

          {error && (
            <p className="text-red-500 text-xs mt-3 font-medium text-center">
              {error}
            </p>
          )}

          <div className="mt-6 text-center text-sm border-t border-gray-200 pt-6">
            <span className="text-gray-600">
              {isLogin ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
            </span>{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 font-medium hover:underline"
            >
              {isLogin ? 'Cadastre-se aqui' : 'Faça login'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            A autenticação e o cadastro são realizados com segurança pelo
            Amazon Cognito.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('feed');
  const [reviews, setReviews] = useState<any[]>(INITIAL_REVIEWS);

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const [viewedUser, setViewedUser] = useState<any>(null);
  const [activeChatUser, setActiveChatUser] = useState<any>(null);

  // Recupera a sessão Cognito ao abrir o aplicativo.
  useEffect(() => {
    const loadAuthenticatedUser = async () => {
      try {
        const user = await getCurrentUser();
        const session = await fetchAuthSession();

        const email = session.tokens?.idToken?.payload?.email;
        const tokenName = session.tokens?.idToken?.payload?.name;

        const name =
          typeof tokenName === 'string'
            ? tokenName
            : typeof email === 'string'
            ? email.split('@')[0]
            : user.username;

        setCurrentUser({
          id: user.userId,
          name,
          email: typeof email === 'string' ? email : '',
          avatar: '',
          bio: 'Estudante e apaixonada por livros.',
        });
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadAuthenticatedUser();
  }, []);

  useEffect(() => {
    if (currentView === 'chat' && !currentUser && !authLoading) {
      setCurrentView('auth');
    }
  }, [currentView, currentUser, authLoading]);

  const handleUserClick = (user: any) => {
    setViewedUser(user);
    setCurrentView('profile');
  };

  const handleSendMessageClick = (user: any) => {
    setActiveChatUser(user);
    setCurrentView('chat');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      setCurrentView('feed');
      setViewedUser(null);
      setActiveChatUser(null);
    } catch (error) {
      console.error('Erro ao sair do Cognito:', error);
      setAuthError('Não foi possível encerrar a sessão. Tente novamente.');
    }
  };

  const handleSaveProfile = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    setViewedUser(updatedUser);

    const updateObj = (obj: any) =>
      obj.user.id === updatedUser.id
        ? { ...obj, user: updatedUser }
        : obj;

    setReviews((prev) =>
      prev.map((review) => {
        const updatedReview = updateObj(review);

        updatedReview.comments = updatedReview.comments.map(
          (comment: any) => {
            const updatedComment = updateObj(comment);

            updatedComment.replies = updatedComment.replies.map(
              (reply: any) => updateObj(reply)
            );

            return updatedComment;
          }
        );

        return updatedReview;
      })
    );
  };

  // --- LÓGICA DE CURTIDAS E COMENTÁRIOS ---
  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value)
      ? arr.filter((item) => item !== value)
      : [...arr, value];

  const handleLikeReview = (reviewId: string) => {
    if (!currentUser) return;

    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              likedBy: toggleArray(review.likedBy, currentUser.id),
            }
          : review
      )
    );
  };

  const handleLikeComment = (
    reviewId: string,
    commentId: string
  ) => {
    if (!currentUser) return;

    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: review.comments.map((comment: any) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      likedBy: toggleArray(
                        comment.likedBy,
                        currentUser.id
                      ),
                    }
                  : comment
              ),
            }
          : review
      )
    );
  };

  const handleLikeReply = (
    reviewId: string,
    commentId: string,
    replyId: string
  ) => {
    if (!currentUser) return;

    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: review.comments.map((comment: any) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      replies: comment.replies.map((reply: any) =>
                        reply.id === replyId
                          ? {
                              ...reply,
                              likedBy: toggleArray(
                                reply.likedBy,
                                currentUser.id
                              ),
                            }
                          : reply
                      ),
                    }
                  : comment
              ),
            }
          : review
      )
    );
  };

  const handleAddComment = (
    reviewId: string,
    text: string
  ) => {
    if (!currentUser) return;

    const newComment = {
      id: Date.now().toString(),
      user: currentUser,
      text,
      likedBy: [],
      replies: [],
    };

    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: [...review.comments, newComment],
            }
          : review
      )
    );
  };

  const handleAddReply = (
    reviewId: string,
    commentId: string,
    text: string
  ) => {
    if (!currentUser) return;

    const newReply = {
      id: Date.now().toString(),
      user: currentUser,
      text,
      likedBy: [],
    };

    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: review.comments.map((comment: any) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      replies: [...comment.replies, newReply],
                    }
                  : comment
              ),
            }
          : review
      )
    );
  };

  const handleAddReview = ({
    book,
    rating,
    text,
  }: {
    book: any;
    rating: number;
    text: string;
  }) => {
    if (!currentUser) return;

    const newReview = {
      id: Date.now().toString(),
      user: currentUser,
      book,
      rating,
      text,
      likedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    setReviews((prev) => [newReview, ...prev]);
    setCurrentView('feed');
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-gray-900 pb-10">
      <Header
        currentUser={currentUser}
        currentView={currentView}
        setView={setCurrentView}
        handleLogout={handleLogout}
        onUserClick={handleUserClick}
      />

      <main>
        <style>{`
          .fade-in {
            animation: fadeIn 0.3s ease-in-out;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(5px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {authLoading ? (
          <div className="flex justify-center items-center py-20 text-gray-500">
            Verificando sessão...
          </div>
        ) : (
          <>
            {currentView === 'auth' && (
              <AuthView error={authError} />
            )}

            {currentView === 'feed' && (
              <FeedView
                currentUser={currentUser}
                reviews={reviews}
                onUserClick={handleUserClick}
                actions={{
                  onToggleLikeReview: handleLikeReview,
                  onToggleLikeComment: handleLikeComment,
                  onToggleLikeReply: handleLikeReply,
                  onAddComment: handleAddComment,
                  onAddReply: handleAddReply,
                }}
              />
            )}

            {currentView === 'search' && (
              <SearchView
                currentUser={currentUser}
                onAddReview={handleAddReview}
              />
            )}

            {currentView === 'chat' && currentUser && (
              <ChatView
                currentUser={currentUser}
                activeChatUser={activeChatUser}
              />
            )}

            {currentView === 'profile' && viewedUser && (
              <ProfileView
                profileUser={viewedUser}
                currentUser={currentUser}
                reviews={reviews}
                onSaveProfile={handleSaveProfile}
                onSendMessage={handleSendMessageClick}
                onBack={() => setCurrentView('feed')}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}