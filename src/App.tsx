import React, { useState, useEffect, useRef } from 'react';
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
  Bell,
  Bot,
  Trash2,
} from 'lucide-react';

import {
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
  signOut,
} from 'aws-amplify/auth';

// 1. URL do WebSocket do Chatbot via DNS customizado (sem barra no final para não quebrar o ?token=)
const WEBSOCKET_URL = 'wss://chat.aparecida.dunga.web.ufersa.dev.br';

// 2. URLs da HTTP API via DNS customizado
const API_BASE_URL = 'https://api.aparecida.dunga.web.ufersa.dev.br';
const PROFILE_API_URL = `${API_BASE_URL}/profile`;
const REVIEWS_API_URL = `${API_BASE_URL}/reviews`;
const MESSAGES_API_URL = `${API_BASE_URL}/messages`;

// --- PERGUNTAS RÁPIDAS DO CHATBOT (MODO VISITANTE) ---
const GUEST_FAQ = [
  {
    question: 'O que é o BookConnect?',
    answer:
      'O BookConnect é uma rede social para leitores! Aqui você descobre novos livros, lê e publica resenhas, curte e comenta opiniões e conversa com outros apaixonados por literatura.',
  },
  {
    question: 'Como avaliar um livro?',
    answer:
      'Acesse a aba "Buscar Livros", pesquise pelo título ou autor desejado e clique em "+ Fazer Resenha". Para publicar sua nota e opinião, basta estar conectado à sua conta.',
  },
  {
    question: 'Como pesquisar resenhas de um livro?',
    answer:
      'No topo do Feed da Comunidade, use a barra de pesquisa para buscar pelo título do livro, autor, trecho da resenha ou nome do leitor.',
  },
  {
    question: 'Como conversar com outros leitores?',
    answer:
      'Depois de fazer login, você pode usar a aba "Mensagens" ou clicar em "Enviar Mensagem" no perfil de qualquer usuário para iniciar um chat privado.',
  },
  {
    question: 'Preciso de conta para usar o site?',
    answer:
      'Como visitante, você já pode explorar e pesquisar resenhas no Feed e buscar livros no acervo. Criando uma conta gratuita, você libera resenhas, curtidas, comentários, mensagens diretas e o assistente de IA completo!',
  },
];

// --- MOCK DATA INICIAL ---
const MOCK_USERS: Record<string, any> = {
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

// Utilitário para ignorar acentos e maiúsculas na busca
const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

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

// 1. HEADER (COM ÍCONE DE NOTIFICAÇÕES PARA USUÁRIOS LOGADOS)
const Header = ({
  currentUser,
  currentView,
  setView,
  handleLogout,
  onUserClick,
  notifications,
  onOpenNotification,
}: {
  currentUser: any;
  currentView: string;
  setView: (view: string) => void;
  handleLogout: () => void;
  onUserClick: (user: any) => void;
  notifications: any[];
  onOpenNotification: (notif: any) => void;
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const NavButton = ({
    view,
    icon: Icon,
    label,
    badge,
  }: {
    view: string;
    icon: any;
    label: string;
    badge?: number;
  }) => (
    <button
      onClick={() => setView(view)}
      className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors relative ${
        currentView === view
          ? 'bg-indigo-100 text-indigo-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      ) : null}
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
                view="messages"
                icon={MessageCircle}
                label="Mensagens"
                badge={unreadCount}
              />
            )}
          </nav>

          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                {/* Ícone de Notificações */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifDropdown((prev) => !prev)}
                    className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Notificações"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <span className="font-semibold text-sm text-gray-800">
                          Notificações
                        </span>
                        <button
                          onClick={() => setShowNotifDropdown(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-gray-400">
                            Nenhuma notificação no momento.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => {
                                setShowNotifDropdown(false);
                                onOpenNotification(notif);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                                !notif.read ? 'bg-indigo-50/50' : ''
                              }`}
                            >
                              <AvatarDisplay
                                alt={notif.fromName}
                                className="w-8 h-8 rounded-full text-xs mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-900">
                                  <span className="font-semibold">
                                    {notif.fromName}
                                  </span>{' '}
                                  enviou uma mensagem:
                                </p>
                                <p className="text-xs text-gray-600 truncate mt-0.5">
                                  "{notif.text}"
                                </p>
                                <span className="text-[10px] text-gray-400 mt-1 block">
                                  {notif.createdAt
                                    ? new Date(notif.createdAt).toLocaleTimeString(
                                        [],
                                        {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        }
                                      )
                                    : ''}
                                </span>
                              </div>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md transition-colors"
                  onClick={() => onUserClick(currentUser)}
                >
                  <AvatarDisplay
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border border-gray-300"
                  />
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
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

// 2. PERFIL (OPERAÇÃO PUT /profile -> SALVA FOTO NO S3 E DADOS NO DYNAMODB)
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
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const [newImageType, setNewImageType] = useState<string>('image/jpeg');
  const [isSaving, setIsSaving] = useState(false);

  const userReviews = reviews.filter(
    (review) => review.user.id === profileUser.id
  );

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await fetch(PROFILE_API_URL, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          bio,
          avatarUrl: avatar.startsWith('http') ? avatar : '',
          imageBase64: newImageBase64,
          contentType: newImageType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar perfil na AWS.');
      }

      const separator = result.profile?.avatarUrl?.includes('?') ? '&' : '?';
      const updatedAvatarUrl = result.profile?.avatarUrl
        ? `${result.profile.avatarUrl}${separator}t=${Date.now()}`
        : avatar;

      setAvatar(updatedAvatarUrl);
      onSaveProfile({
        ...profileUser,
        name,
        bio,
        avatar: updatedAvatarUrl,
      });

      setNewImageBase64(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar dados no DynamoDB/S3.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setNewImageType(file.type || 'image/jpeg');
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64Str = String(reader.result || '');
        setAvatar(base64Str);
        setNewImageBase64(base64Str);
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
                    disabled={isSaving}
                    className="flex items-center space-x-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                  >
                    <Save size={16} />
                    <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
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
                  Foto de Perfil (S3)
                </label>

                <input
                  type="file"
                  accept="image/jpeg, image/png"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 outline-none"
                />

                {avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatar('');
                      setNewImageBase64(null);
                    }}
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
              {profileUser.email && (
                <p className="text-sm text-gray-500">{profileUser.email}</p>
              )}
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
                <p className="text-gray-700 mt-2 text-sm">"{review.text}"</p>
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

// 3. FEED E COMENTÁRIOS (COM BUSCA DE RESENHAS PARA VISITANTES E LOGADOS + EXCLUSÃO DE COMENTÁRIOS + TOGGLE DE CURTIDA)
const FeedView = ({
  currentUser,
  reviews,
  actions,
  onUserClick,
  onRequireAuth,
}: {
  currentUser: any;
  reviews: any[];
  actions: any;
  onUserClick: (user: any) => void;
  onRequireAuth: () => void;
}) => {
  const [feedSearch, setFeedSearch] = useState('');
  const [activeCommentReview, setActiveCommentReview] = useState<string | null>(
    null
  );
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    reviewId: string;
    commentId: string;
  } | null>(null);
  const [replyText, setReplyText] = useState('');

  const normalizedQuery = normalizeText(feedSearch.trim());
  const filteredReviews = normalizedQuery
    ? reviews.filter((review) => {
        const title = normalizeText(review.book?.title || '');
        const author = normalizeText(review.book?.author || '');
        const text = normalizeText(review.text || '');
        const reviewer = normalizeText(review.user?.name || '');
        return (
          title.includes(normalizedQuery) ||
          author.includes(normalizedQuery) ||
          text.includes(normalizedQuery) ||
          reviewer.includes(normalizedQuery)
        );
      })
    : reviews;

  const submitComment = (reviewId: string) => {
    if (!currentUser || !commentText.trim()) return;

    actions.onAddComment(reviewId, commentText);
    setCommentText('');
  };

  const submitReply = (reviewId: string, commentId: string) => {
    if (!currentUser || !replyText.trim()) return;

    actions.onAddReply(reviewId, commentId, replyText);
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

      {/* Barra de Pesquisa de Resenhas (visível para visitantes e usuários logados) */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>

          <input
            type="text"
            value={feedSearch}
            onChange={(e) => setFeedSearch(e.target.value)}
            placeholder="Pesquisar resenhas por livro, autor ou leitor..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />

          {feedSearch && (
            <button
              type="button"
              onClick={() => setFeedSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              title="Limpar pesquisa"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {feedSearch.trim() && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              {filteredReviews.length === 0
                ? `Nenhuma resenha encontrada para "${feedSearch.trim()}"`
                : filteredReviews.length === 1
                ? `1 resenha encontrada para "${feedSearch.trim()}"`
                : `${filteredReviews.length} resenhas encontradas para "${feedSearch.trim()}"`}
            </span>
            <button
              type="button"
              onClick={() => setFeedSearch('')}
              className="text-indigo-600 hover:underline font-medium"
            >
              Limpar filtro
            </button>
          </div>
        )}
      </div>

      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm fade-in">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">
            Nenhuma resenha encontrada para esse livro.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tente buscar por outro título, autor ou limpe a pesquisa para ver
            todo o feed.
          </p>
          {feedSearch && (
            <button
              type="button"
              onClick={() => setFeedSearch('')}
              className="mt-4 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              Ver todas as resenhas
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviews.map((review) => {
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
                      onClick={() => {
                        if (!currentUser) {
                          onRequireAuth();
                          return;
                        }
                        actions.onToggleLikeReview(review.id);
                      }}
                      title={
                        !currentUser
                          ? 'Faça login para curtir'
                          : hasLikedReview
                          ? 'Remover curtida'
                          : 'Curtir resenha'
                      }
                      className={`flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        hasLikedReview
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
                          currentUser && replyingTo?.commentId === comment.id;

                        const canDeleteComment =
                          currentUser &&
                          (comment.user.id === currentUser.id ||
                            review.user.id === currentUser.id);

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
                                    onClick={() => {
                                      if (!currentUser) {
                                        onRequireAuth();
                                        return;
                                      }
                                      actions.onToggleLikeComment(
                                        review.id,
                                        comment.id
                                      );
                                    }}
                                    className={`${
                                      hasLikedComment
                                        ? 'text-red-500'
                                        : 'hover:text-gray-800'
                                    }`}
                                  >
                                    {hasLikedComment ? 'Curtiu' : 'Curtir'} (
                                    {comment.likedBy.length})
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (!currentUser) {
                                        onRequireAuth();
                                        return;
                                      }
                                      setReplyingTo({
                                        reviewId: review.id,
                                        commentId: comment.id,
                                      });
                                    }}
                                    className="hover:text-gray-800"
                                  >
                                    Responder
                                  </button>

                                  {canDeleteComment && (
                                    <button
                                      onClick={() =>
                                        actions.onDeleteComment(
                                          review.id,
                                          comment.id
                                        )
                                      }
                                      className="flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors"
                                      title="Excluir comentário"
                                    >
                                      <Trash2 size={12} />
                                      <span>Excluir</span>
                                    </button>
                                  )}
                                </div>

                                {comment.replies.length > 0 && (
                                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                                    {comment.replies.map((reply: any) => {
                                      const hasLikedReply =
                                        currentUser &&
                                        reply.likedBy.includes(currentUser.id);

                                      const canDeleteReply =
                                        currentUser &&
                                        (reply.user.id === currentUser.id ||
                                          review.user.id === currentUser.id);

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

                                            <div className="flex items-center gap-3 mt-1 ml-1 text-[11px] text-gray-500 font-medium">
                                              <button
                                                onClick={() => {
                                                  if (!currentUser) {
                                                    onRequireAuth();
                                                    return;
                                                  }
                                                  actions.onToggleLikeReply(
                                                    review.id,
                                                    comment.id,
                                                    reply.id
                                                  );
                                                }}
                                                className={`${
                                                  hasLikedReply
                                                    ? 'text-red-500'
                                                    : 'hover:text-gray-800'
                                                }`}
                                              >
                                                {hasLikedReply
                                                  ? 'Curtiu'
                                                  : 'Curtir'}{' '}
                                                ({reply.likedBy.length})
                                              </button>

                                              {canDeleteReply && (
                                                <button
                                                  onClick={() =>
                                                    actions.onDeleteReply(
                                                      review.id,
                                                      comment.id,
                                                      reply.id
                                                    )
                                                  }
                                                  className="flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors"
                                                  title="Excluir resposta"
                                                >
                                                  <Trash2 size={11} />
                                                  <span>Excluir</span>
                                                </button>
                                              )}
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
                                      onKeyDown={(e) =>
                                        e.key === 'Enter' &&
                                        submitReply(review.id, comment.id)
                                      }
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
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="w-full text-center text-sm text-indigo-600 font-medium mt-4 bg-white hover:bg-indigo-50 p-2.5 rounded-md border border-indigo-200 transition-colors"
                      >
                        Faça login para curtir ou comentar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 4. BUSCA E API OPEN LIBRARY
const SearchView = ({
  currentUser,
  onAddReview,
  onRequireAuth,
}: {
  currentUser: any;
  onAddReview: (review: any) => void;
  onRequireAuth: () => void;
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
    if (!currentUser) return;
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
                    onClick={() => {
                      if (!currentUser) {
                        onRequireAuth();
                        return;
                      }
                      setSelectedBook(book);
                    }}
                    className={`w-full py-2 rounded-md font-medium text-sm transition-colors ${
                      currentUser
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
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

      {selectedBook && currentUser && (
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

// 5. MENSAGENS DIRETAS ENTRE PERFIS (PERSISTIDAS NO DYNAMODB VIA /messages)
const DirectMessagesView = ({
  currentUser,
  contacts,
  initialRecipient,
  onNotificationsUpdated,
}: {
  currentUser: any;
  contacts: any[];
  initialRecipient: any;
  onNotificationsUpdated: (notifs: any[]) => void;
}) => {
  const [selectedContact, setSelectedContact] = useState<any>(
    initialRecipient || contacts[0] || null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (initialRecipient) {
      setSelectedContact(initialRecipient);
    }
  }, [initialRecipient]);

  const fetchConversation = async (contactId: string, showLoader = false) => {
    if (!currentUser || !contactId) return;
    if (showLoader) setIsLoadingMsgs(true);

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (!idToken) return;

      const res = await fetch(
        `${MESSAGES_API_URL}?with=${encodeURIComponent(contactId)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.notifications) {
          onNotificationsUpdated(data.notifications);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      if (showLoader) setIsLoadingMsgs(false);
    }
  };

  useEffect(() => {
    if (!selectedContact) return;
    fetchConversation(selectedContact.id, true);

    const interval = setInterval(() => {
      fetchConversation(selectedContact.id, false);
    }, 8000);

    return () => clearInterval(interval);
  }, [selectedContact?.id]);

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMsg.trim();
    if (!currentUser || !selectedContact || !text || isSending) return;

    setIsSending(true);
    setInputMsg('');

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (!idToken) return;

      const res = await fetch(MESSAGES_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toId: selectedContact.id,
          fromName: currentUser.name,
          text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 h-[calc(100vh-80px)] flex flex-col fade-in">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Mensagens</h2>
        <p className="text-sm text-gray-500 mt-1">
          Converse diretamente com outros leitores do BookConnect.
        </p>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex min-h-[420px]">
        {/* Lista de Perfis */}
        <div className="w-1/3 sm:w-72 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-3 border-b border-gray-200 font-semibold text-sm text-gray-700">
            Perfis da Comunidade
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {contacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 border-r-4 border-indigo-600'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <AvatarDisplay
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-10 h-10 rounded-full text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {contact.bio || 'Leitor do BookConnect'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Área da Conversa */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              <div className="p-3 border-b border-gray-200 bg-white flex items-center gap-3">
                <AvatarDisplay
                  src={selectedContact.avatar}
                  alt={selectedContact.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedContact.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedContact.bio || 'Leitor do BookConnect'}
                  </p>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-[#F9FAFB] space-y-3">
                {isLoadingMsgs ? (
                  <div className="text-center text-gray-400 mt-10 text-sm">
                    Carregando conversa...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                    <MessageCircle
                      size={32}
                      className="mx-auto mb-2 opacity-50"
                    />
                    <p className="text-sm font-medium">
                      Nenhuma mensagem com {selectedContact.name} ainda.
                    </p>
                    <p className="text-xs mt-1">
                      Envie a primeira mensagem abaixo!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.fromId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            isMine
                              ? 'bg-indigo-600 text-white rounded-br-sm'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                          <span
                            className={`text-[10px] block mt-1 text-right ${
                              isMine ? 'text-indigo-200' : 'text-gray-400'
                            }`}
                          >
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 bg-white border-t border-gray-200">
                <form
                  onSubmit={handleSendDirectMessage}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder={`Escreva uma mensagem para ${selectedContact.name}...`}
                    className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-full px-4 py-2 text-sm outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputMsg.trim() || isSending}
                    className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    title="Enviar mensagem"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecione um perfil à esquerda para conversar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 6. CHATBOT FLUTUANTE NO CANTO INFERIOR DIREITO (FAQ LOCAL PARA VISITANTES + WEBSOCKET/GEMINI PARA LOGADOS)
const FloatingChatbot = ({
  currentUser,
  onRequireAuth,
}: {
  currentUser: any;
  onRequireAuth: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    {
      id: string;
      sender: 'user' | 'assistant';
      text: string;
      timestamp: string;
    }[]
  >([]);

  const [inputMsg, setInputMsg] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');

  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingResponse, isOpen]);

  useEffect(() => {
    setMessages([]);

    if (!currentUser) {
      setConnectionStatus('disconnected');
      setConnectionError('');
      return;
    }

    let socket: WebSocket | null = null;
    let isMounted = true;

    const connectWebSocket = async () => {
      try {
        setConnectionStatus('connecting');
        setConnectionError('');

        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken?.toString();

        if (!accessToken) {
          throw new Error(
            'Não foi encontrado um Access Token. Faça login novamente.'
          );
        }

        const authenticatedUrl = `${WEBSOCKET_URL}?token=${encodeURIComponent(
          accessToken
        )}`;

        socket = new WebSocket(authenticatedUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          setConnectionStatus('connected');
          setConnectionError('');
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const data = JSON.parse(event.data);

            const responseText =
              data.answer ?? data.response ?? data.message ?? data.text;

            if (responseText) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-assistant`,
                  sender: 'assistant',
                  text: String(responseText),
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
              ]);

              setIsWaitingResponse(false);
            }

            if (data.error) {
              setConnectionError(String(data.error));
              setIsWaitingResponse(false);
            }
          } catch (error) {
            console.error(
              'Não foi possível interpretar a resposta do WebSocket:',
              error
            );

            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-assistant`,
                sender: 'assistant',
                text: String(event.data),
                timestamp: new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
            ]);

            setIsWaitingResponse(false);
          }
        };

        socket.onerror = (event) => {
          console.error('Erro na conexão WebSocket:', event);
          if (!isMounted) return;

          setConnectionStatus('error');
          setConnectionError(
            'Não foi possível conectar ao chat. Verifique a API Gateway e a Lambda.'
          );
          setIsWaitingResponse(false);
        };

        socket.onclose = (event) => {
          if (!isMounted) return;
          setConnectionStatus('disconnected');
          setIsWaitingResponse(false);
          console.log('WebSocket encerrado:', event.code, event.reason);
        };
      } catch (error) {
        console.error('Erro ao conectar ao WebSocket:', error);
        if (!isMounted) return;

        setConnectionStatus('error');
        setConnectionError(
          error instanceof Error
            ? error.message
            : 'Erro ao iniciar conexão com o chat.'
        );
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (socket) {
        socket.close();
      }
      socketRef.current = null;
    };
  }, [currentUser?.id]);

  const handleFaqClick = (faq: { question: string; answer: string }) => {
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-guest-q`,
        sender: 'user',
        text: faq.question,
        timestamp: now,
      },
      {
        id: `${Date.now() + 1}-guest-a`,
        sender: 'assistant',
        text: faq.answer,
        timestamp: now,
      },
    ]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();

    const question = inputMsg.trim();
    if (!question) return;

    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setConnectionError(
        'O chat não está conectado. Aguarde a conexão ou recarregue a página.'
      );
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        sender: 'user',
        text: question,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);

    setInputMsg('');
    setIsWaitingResponse(true);
    setConnectionError('');

    socket.send(
      JSON.stringify({
        action: 'message',
        question,
        userId: currentUser?.id,
      })
    );
  };

  const handleReconnect = () => {
    window.location.reload();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col fade-in">
          <div className="p-3 bg-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">
                  Assistente BookConnect
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !currentUser
                        ? 'bg-emerald-300'
                        : connectionStatus === 'connected'
                        ? 'bg-green-400'
                        : connectionStatus === 'connecting'
                        ? 'bg-yellow-300'
                        : 'bg-red-400'
                    }`}
                  />
                  <span className="text-[11px] text-indigo-100">
                    {!currentUser
                      ? 'Visitante • Perguntas Rápidas'
                      : connectionStatus === 'connected'
                      ? 'Conectado (Gemini)'
                      : connectionStatus === 'connecting'
                      ? 'Conectando...'
                      : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentUser && connectionStatus !== 'connected' && (
                <button
                  type="button"
                  onClick={handleReconnect}
                  className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
                >
                  Reconectar
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-indigo-100 hover:text-white p-1"
                title="Fechar chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-[#F9FAFB] space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-4">
                <Bot size={36} className="mx-auto mb-2 text-indigo-400" />
                {currentUser ? (
                  <>
                    <p className="font-medium text-sm text-gray-700">
                      Olá, {currentUser?.name?.split(' ')[0]}!
                    </p>
                    <p className="text-xs mt-1 text-gray-500">
                      Envie uma pergunta para conversar com o assistente do
                      BookConnect.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-sm text-gray-700">
                      Olá! Bem-vindo ao BookConnect 📚
                    </p>
                    <p className="text-xs mt-1 text-gray-500">
                      Escolha uma pergunta abaixo para saber como o site
                      funciona:
                    </p>
                  </>
                )}
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                    <span
                      className={`text-[10px] block mt-1.5 text-right ${
                        isUser ? 'text-indigo-200' : 'text-gray-400'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {!currentUser && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Perguntas rápidas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GUEST_FAQ.map((faq) => (
                    <button
                      key={faq.question}
                      type="button"
                      onClick={() => handleFaqClick(faq)}
                      className="text-left text-xs bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl px-3 py-1.5 transition-colors shadow-sm"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isWaitingResponse && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-gray-500">
                  Gemini está processando sua pergunta...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {currentUser && connectionError && (
            <div className="px-3 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600">
              {connectionError}
            </div>
          )}

          <div className="p-3 bg-white border-t border-gray-200">
            {currentUser ? (
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder={
                    connectionStatus === 'connected'
                      ? 'Digite sua pergunta...'
                      : 'Aguardando conexão...'
                  }
                  disabled={connectionStatus !== 'connected'}
                  className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-full px-4 py-2 text-sm outline-none transition-all disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={
                    !inputMsg.trim() ||
                    connectionStatus !== 'connected' ||
                    isWaitingResponse
                  }
                  className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  title="Enviar pergunta"
                >
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xs text-gray-600">
                  Quer conversar livremente com a IA (Gemini) e pedir
                  recomendações?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onRequireAuth();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-full hover:bg-indigo-700 transition-colors"
                >
                  <LogIn size={14} />
                  <span>Fazer login para usar a IA completa</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão Flutuante do Chatbot */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center"
        title="Abrir Assistente (BookConnect)"
      >
        {isOpen ? <X size={24} /> : <Bot size={26} />}
      </button>
    </div>
  );
};

// 7. AUTH — AMAZON COGNITO
const AuthView = ({ error }: { error: string }) => {
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const [viewedUser, setViewedUser] = useState<any>(null);

  // Carrega as resenhas, curtidas e comentários salvos no DynamoDB (público para visitantes)
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const res = await fetch(REVIEWS_API_URL, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews);
          }
        }
      } catch (err) {
        console.log('Usando resenhas iniciais enquanto /reviews não responde.');
      }
    };

    loadReviews();
  }, []);

  // Persiste alterações do feed no DynamoDB (somente usuário autenticado)
  const persistReviews = async (updatedReviews: any[]) => {
    if (!currentUser) return;
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (!idToken) return;

      const res = await fetch(REVIEWS_API_URL, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviews: updatedReviews }),
      });

      if (!res.ok) {
        console.error(
          'Falha ao salvar resenhas no DynamoDB:',
          res.status,
          await res.text()
        );
      }
    } catch (err) {
      console.error('Erro ao salvar interações do feed no DynamoDB:', err);
    }
  };

  // Recupera a sessão Cognito e carrega os dados + foto do DynamoDB/S3 via GET /profile
  useEffect(() => {
    const loadAuthenticatedUser = async () => {
      try {
        const user = await getCurrentUser();
        const session = await fetchAuthSession();

        const email = session.tokens?.idToken?.payload?.email;
        const tokenName = session.tokens?.idToken?.payload?.name;
        const picture = session.tokens?.idToken?.payload?.picture;
        const idToken = session.tokens?.idToken?.toString();

        let savedName =
          typeof tokenName === 'string'
            ? tokenName
            : typeof email === 'string'
            ? email.split('@')[0]
            : user.username;
        let savedBio = 'Estudante e apaixonada por livros.';
        let savedAvatarUrl = typeof picture === 'string' ? picture : '';

        if (idToken) {
          try {
            const profileRes = await fetch(PROFILE_API_URL, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            });

            if (profileRes.ok) {
              const profileData = await profileRes.json();
              if (profileData.name) savedName = profileData.name;
              if (profileData.bio) savedBio = profileData.bio;
              if (profileData.avatarUrl) {
                savedAvatarUrl = profileData.avatarUrl;
              }
            }
          } catch (err) {
            console.log(
              'Perfil ainda não salvo no DynamoDB, usando dados do Cognito.'
            );
          }
        }

        setCurrentUser({
          id: user.userId,
          name: savedName,
          email: typeof email === 'string' ? email : '',
          avatar: savedAvatarUrl,
          bio: savedBio,
        });
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadAuthenticatedUser();
  }, []);

  // Busca notificações de novas mensagens a cada 15 segundos para usuários logados
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        if (!idToken) return;

        const res = await fetch(MESSAGES_API_URL, {
          method: 'GET',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error('Erro ao buscar notificações:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Bloqueia acesso à aba de mensagens para visitantes não logados
  useEffect(() => {
    if (currentView === 'messages' && !currentUser && !authLoading) {
      setCurrentView('auth');
    }
  }, [currentView, currentUser, authLoading]);

  // Monta lista de perfis disponíveis para trocar mensagens (exclui o usuário atual)
  const availableContacts = React.useMemo(() => {
    const map = new Map<string, any>();

    Object.values(MOCK_USERS).forEach((u) => map.set(u.id, u));

    reviews.forEach((r) => {
      if (r.user?.id) map.set(r.user.id, r.user);
      (r.comments || []).forEach((c: any) => {
        if (c.user?.id) map.set(c.user.id, c.user);
        (c.replies || []).forEach((rep: any) => {
          if (rep.user?.id) map.set(rep.user.id, rep.user);
        });
      });
    });

    notifications.forEach((n) => {
      if (n.fromId && !map.has(n.fromId)) {
        map.set(n.fromId, {
          id: n.fromId,
          name: n.fromName || 'Usuário',
          avatar: '',
          bio: 'Leitor do BookConnect',
        });
      }
    });

    if (currentUser?.id) {
      map.delete(currentUser.id);
    }

    return Array.from(map.values());
  }, [reviews, notifications, currentUser]);

  const handleUserClick = (user: any) => {
    setViewedUser(user);
    setCurrentView('profile');
  };

  const handleSendMessageClick = (targetUser: any) => {
    if (!currentUser) {
      setCurrentView('auth');
      return;
    }
    setSelectedChatUser(targetUser);
    setCurrentView('messages');
  };

  const handleOpenNotification = (notif: any) => {
    if (!currentUser) return;
    const found = availableContacts.find((c) => c.id === notif.fromId) || {
      id: notif.fromId,
      name: notif.fromName || 'Usuário',
      avatar: '',
      bio: 'Leitor do BookConnect',
    };
    setSelectedChatUser(found);
    setCurrentView('messages');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      setNotifications([]);
      setCurrentView('feed');
      setViewedUser(null);
    } catch (error) {
      console.error('Erro ao sair do Cognito:', error);
      setAuthError('Não foi possível encerrar a sessão. Tente novamente.');
    }
  };

  const handleSaveProfile = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    setViewedUser(updatedUser);

    const updateObj = (obj: any) =>
      obj.user.id === updatedUser.id ? { ...obj, user: updatedUser } : obj;

    setReviews((prev) => {
      const updated = prev.map((review) => {
        const updatedReview = updateObj(review);

        updatedReview.comments = updatedReview.comments.map((comment: any) => {
          const updatedComment = updateObj(comment);

          updatedComment.replies = updatedComment.replies.map((reply: any) =>
            updateObj(reply)
          );

          return updatedComment;
        });

        return updatedReview;
      });
      persistReviews(updated);
      return updated;
    });
  };

  // --- LÓGICA DE CURTIDAS E COMENTÁRIOS (APENAS LOGADOS + SALVANDO NO DYNAMODB) ---
  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value)
      ? arr.filter((item) => item !== value)
      : [...arr, value];

  const handleLikeReview = (reviewId: string) => {
    if (!currentUser) {
      setCurrentView('auth');
      return;
    }

    setReviews((prev) => {
      const updated = prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              likedBy: toggleArray(review.likedBy, currentUser.id),
            }
          : review
      );
      persistReviews(updated);
      return updated;
    });
  };

  const handleLikeComment = (reviewId: string, commentId: string) => {
    if (!currentUser) {
      setCurrentView('auth');
      return;
    }

    setReviews((prev) => {
      const updated = prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: review.comments.map((comment: any) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      likedBy: toggleArray(comment.likedBy, currentUser.id),
                    }
                  : comment
              ),
            }
          : review
      );
      persistReviews(updated);
      return updated;
    });
  };

  const handleLikeReply = (
    reviewId: string,
    commentId: string,
    replyId: string
  ) => {
    if (!currentUser) return;

    setReviews((prev) => {
      const updated = prev.map((review) =>
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
      );
      persistReviews(updated);
      return updated;
    });
  };

  const handleAddComment = (reviewId: string, text: string) => {
    if (!currentUser) {
      setCurrentView('auth');
      return;
    }

    const newComment = {
      id: Date.now().toString(),
      user: currentUser,
      text,
      likedBy: [],
      replies: [],
    };

    setReviews((prev) => {
      const updated = prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: [...review.comments, newComment],
            }
          : review
      );
      persistReviews(updated);
      return updated;
    });
  };

  const handleDeleteComment = (reviewId: string, commentId: string) => {
    if (!currentUser) return;

    setReviews((prev) => {
      const updated = prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: review.comments.filter((c: any) => c.id !== commentId),
            }
          : review
      );
      persistReviews(updated);
      return updated;
    });
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

    setReviews((prev) => {
      const updated = prev.map((review) =>
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
      );
      persistReviews(updated);
      return updated;
    });
  };

  const handleDeleteReply = (
    reviewId: string,
    commentId: string,
    replyId: string
  ) => {
    if (!currentUser) return;

    setReviews((prev) => {
      const updated = prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: review.comments.map((comment: any) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      replies: comment.replies.filter(
                        (r: any) => r.id !== replyId
                      ),
                    }
                  : comment
              ),
            }
          : review
      );
      persistReviews(updated);
      return updated;
    });
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

    setReviews((prev) => {
      const updated = [newReview, ...prev];
      persistReviews(updated);
      return updated;
    });
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
        notifications={notifications}
        onOpenNotification={handleOpenNotification}
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
            {currentView === 'auth' && <AuthView error={authError} />}

            {currentView === 'feed' && (
              <FeedView
                currentUser={currentUser}
                reviews={reviews}
                onUserClick={handleUserClick}
                onRequireAuth={() => setCurrentView('auth')}
                actions={{
                  onToggleLikeReview: handleLikeReview,
                  onToggleLikeComment: handleLikeComment,
                  onToggleLikeReply: handleLikeReply,
                  onAddComment: handleAddComment,
                  onDeleteComment: handleDeleteComment,
                  onAddReply: handleAddReply,
                  onDeleteReply: handleDeleteReply,
                }}
              />
            )}

            {currentView === 'search' && (
              <SearchView
                currentUser={currentUser}
                onAddReview={handleAddReview}
                onRequireAuth={() => setCurrentView('auth')}
              />
            )}

            {currentView === 'messages' && currentUser && (
              <DirectMessagesView
                currentUser={currentUser}
                contacts={availableContacts}
                initialRecipient={selectedChatUser}
                onNotificationsUpdated={setNotifications}
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

      {/* Chatbot flutuante — FAQ local para visitantes e IA (Gemini) para logados */}
      <FloatingChatbot
        currentUser={currentUser}
        onRequireAuth={() => setCurrentView('auth')}
      />
    </div>
  );
}