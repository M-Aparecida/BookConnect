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
  Check,
  CheckCheck,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Feather,
  BookMarked,
  Plus,
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
      'Acesse a aba "Acervo", pesquise pelo título ou autor desejado e clique em "+ Escrever Resenha". Para publicar sua nota e opinião, basta estar conectado à sua conta.',
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

const QUICK_SEARCH_SUGGESTIONS = [
  'Dom Casmurro',
  '1984',
  'O Pequeno Príncipe',
  'Harry Potter',
  'Clarice Lispector',
  'É Assim que Acaba',
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
  size,
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: number;
}) => {
  const starSize = size ?? (interactive ? 24 : 15);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={starSize}
          fill={star <= rating ? 'currentColor' : 'none'}
          className={`${
            star <= rating ? 'text-[#C28534]' : 'text-[#D8D1C5]'
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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt || 'Avatar'}
        className={`object-cover shrink-0 ${className || ''}`}
        onClick={onClick}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-center bg-[#E9EFEA] text-[#1E3A2F] font-serif-display font-bold uppercase overflow-hidden shrink-0 ${
        className || ''
      }`}
    >
      {alt ? alt.charAt(0) : <User size={16} />}
    </div>
  );
};

// Componente para exibir resenhas longas com quebra de linha, "Mostrar mais" e rolagem
const ReviewText = ({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const maxChars = compact ? 180 : 260;
  const lineCount = text.split('\n').length;
  const isLong = text.length > maxChars || lineCount > 4;

  const textClasses = compact
    ? 'text-[#3A352F] text-sm leading-relaxed mt-2'
    : 'text-[#2C2824] text-[15px] leading-7 font-normal';

  if (!isLong) {
    return (
      <p
        className={`${textClasses} whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}
      >
        “{text}”
      </p>
    );
  }

  return (
    <div className={compact ? 'mt-2' : ''}>
      {expanded ? (
        <div className="max-h-56 overflow-y-auto pr-2 rounded-xl bg-[#FBF9F5] border border-[#E7E2D8] p-3.5">
          <p
            className={`${textClasses} whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}
          >
            “{text}”
          </p>
        </div>
      ) : (
        <p
          className={`${textClasses} whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}
        >
          “{text.slice(0, maxChars).trimEnd()}...”
        </p>
      )}

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-2 text-xs font-semibold tracking-wide uppercase text-[#1E3A2F] hover:text-[#9A6220] transition-colors focus:outline-none"
      >
        {expanded ? 'Recolher leitura' : 'Continuar lendo'}
      </button>
    </div>
  );
};

// --- COMPONENTES PRINCIPAIS ---

// 1. HEADER EDITORIAL + NAVEGAÇÃO INFERIOR MOBILE
const Header = ({
  currentUser,
  currentView,
  setView,
  handleLogout,
  onUserClick,
  notifications,
  unreadMessagesCount,
  onOpenNotification,
  onMarkAsRead,
  onMarkAllAsRead,
}: {
  currentUser: any;
  currentView: string;
  setView: (view: string) => void;
  handleLogout: () => void;
  onUserClick: (user: any) => void;
  notifications: any[];
  unreadMessagesCount: number;
  onOpenNotification: (notif: any) => void;
  onMarkAsRead: (notifId: string) => void;
  onMarkAllAsRead: () => void;
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Exibe apenas notificações ainda não lidas (somem ao serem lidas/abertas)
  const visibleNotifications = notifications.filter((n) => !n.read);
  const unreadCount = visibleNotifications.length;

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
  }) => {
    const active = currentView === view;
    return (
      <button
        onClick={() => setView(view)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all relative ${
          active
            ? 'bg-[#1E3A2F] text-[#FBF9F5] font-medium shadow-sm'
            : 'text-[#5C554C] hover:text-[#1E3A2F] hover:bg-[#EFECE4]'
        }`}
      >
        <Icon size={16} />
        <span>{label}</span>
        {badge && badge > 0 ? (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              active
                ? 'bg-[#C28534] text-white'
                : 'bg-[#A63D2D] text-white'
            }`}
          >
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  const renderNotifActionText = (notif: any) => {
    if (notif.type === 'like_review') {
      return (
        <>
          <span className="font-semibold">{notif.fromName}</span> curtiu sua
          resenha{notif.bookTitle ? ` de "${notif.bookTitle}"` : ''}.
        </>
      );
    }
    if (notif.type === 'like_comment') {
      return (
        <>
          <span className="font-semibold">{notif.fromName}</span> curtiu seu
          comentário{notif.bookTitle ? ` em "${notif.bookTitle}"` : ''}.
        </>
      );
    }
    if (notif.type === 'comment') {
      return (
        <>
          <span className="font-semibold">{notif.fromName}</span> comentou na
          sua resenha{notif.bookTitle ? ` de "${notif.bookTitle}"` : ''}:
        </>
      );
    }
    if (notif.type === 'reply') {
      return (
        <>
          <span className="font-semibold">{notif.fromName}</span> respondeu ao
          seu comentário{notif.bookTitle ? ` em "${notif.bookTitle}"` : ''}:
        </>
      );
    }
    return (
      <>
        <span className="font-semibold">{notif.fromName}</span> enviou uma
        mensagem:
      </>
    );
  };

  return (
    <header className="bg-[#FBF9F5]/90 backdrop-blur-md border-b border-[#E7E2D8] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 sm:h-[72px] items-center gap-4">
          {/* Marca Editorial */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => setView('feed')}
          >
            <div className="w-9 h-9 rounded-xl bg-[#1E3A2F] text-[#FBF9F5] flex items-center justify-center shadow-sm group-hover:bg-[#284D3E] transition-colors">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif-display text-2xl font-bold tracking-tight text-[#1F1C18] leading-none">
                BookConnect
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C8275] hidden sm:block mt-0.5">
                Clube Literário
              </span>
            </div>
          </div>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-[#F4F0E8] p-1 rounded-full border border-[#E7E2D8]">
            <NavButton view="feed" icon={BookOpen} label="Feed" />
            <NavButton view="search" icon={Search} label="Acervo" />
            {currentUser && (
              <NavButton
                view="messages"
                icon={MessageCircle}
                label="Mensagens"
                badge={unreadMessagesCount}
              />
            )}
          </nav>

          {/* Ações do Usuário */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Ícone de Notificações */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifDropdown((prev) => !prev)}
                    className="relative p-2.5 text-[#5C554C] hover:text-[#1E3A2F] hover:bg-[#EFECE4] rounded-full transition-colors"
                    title="Notificações"
                  >
                    <Bell size={19} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-[#A63D2D] text-white text-[10px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full ring-2 ring-[#FBF9F5]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto mt-2 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#E7E2D8] z-50 overflow-hidden fade-in">
                      <div className="px-4 py-3 border-b border-[#EFECE4] flex justify-between items-center bg-[#FBF9F5]">
                        <span className="font-serif-display font-bold text-base text-[#1F1C18]">
                          Notificações
                        </span>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={onMarkAllAsRead}
                              className="flex items-center gap-1 text-xs text-[#1E3A2F] hover:text-[#9A6220] font-medium"
                              title="Marcar todas como lidas"
                            >
                              <CheckCheck size={14} />
                              <span>Ler todas</span>
                            </button>
                          )}
                          <button
                            onClick={() => setShowNotifDropdown(false)}
                            className="text-[#8C8275] hover:text-[#1F1C18] p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-[#F4F0E8]">
                        {visibleNotifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-[#8C8275]">
                            Nenhuma notificação nova no momento.
                          </div>
                        ) : (
                          visibleNotifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                setShowNotifDropdown(false);
                                onOpenNotification(notif);
                              }}
                              className="w-full text-left px-4 py-3 bg-[#F3F6F3] hover:bg-[#E9EFEA] transition-colors flex items-start gap-3 cursor-pointer"
                            >
                              <div className="relative shrink-0 mt-0.5">
                                <AvatarDisplay
                                  src={notif.fromAvatar}
                                  alt={notif.fromName}
                                  className="w-8 h-8 rounded-full text-xs"
                                />
                                {(notif.type === 'like_review' ||
                                  notif.type === 'like_comment') && (
                                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#A63D2D] text-white flex items-center justify-center ring-2 ring-white">
                                    <Heart size={9} fill="currentColor" />
                                  </span>
                                )}
                                {(notif.type === 'comment' ||
                                  notif.type === 'reply') && (
                                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#1E3A2F] text-white flex items-center justify-center ring-2 ring-white">
                                    <MessageCircle size={9} />
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-[#1F1C18] leading-snug">
                                  {renderNotifActionText(notif)}
                                </p>
                                {notif.text && (
                                  <p className="text-xs text-[#5C554C] truncate mt-0.5">
                                    “{notif.text}”
                                  </p>
                                )}
                                {notif.createdAt && (
                                  <span className="text-[10px] text-[#8C8275] mt-1 block">
                                    {new Date(
                                      notif.createdAt
                                    ).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkAsRead(notif.id);
                                }}
                                className="p-1.5 text-[#1E3A2F] hover:bg-[#DCE7DF] rounded-full shrink-0 mt-0.5 transition-colors"
                                title="Marcar como lida"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pill de Perfil */}
                <button
                  type="button"
                  className="flex items-center gap-2 cursor-pointer bg-white hover:bg-[#F4F0E8] border border-[#E7E2D8] pl-1.5 pr-2 sm:pr-3 py-1 rounded-full transition-colors"
                  onClick={() => onUserClick(currentUser)}
                >
                  <AvatarDisplay
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full border border-[#E7E2D8] text-xs"
                  />
                  <span className="hidden sm:inline text-sm font-medium text-[#2C2824]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2 text-[#8C8275] hover:text-[#A63D2D] hover:bg-[#FDF2F0] rounded-full transition-colors"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView('auth')}
                className="flex items-center gap-2 bg-[#1E3A2F] text-[#FBF9F5] px-4 sm:px-5 py-2 rounded-full text-sm font-medium hover:bg-[#284D3E] shadow-sm transition-all"
              >
                <LogIn size={16} />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// Barra de Navegação Inferior Exclusiva para Mobile (< md)
const MobileBottomNav = ({
  currentUser,
  currentView,
  setView,
  onUserClick,
  unreadCount,
}: {
  currentUser: any;
  currentView: string;
  setView: (view: string) => void;
  onUserClick: (user: any) => void;
  unreadCount: number;
}) => {
  const items = [
    {
      id: 'feed',
      label: 'Feed',
      icon: BookOpen,
      onClick: () => setView('feed'),
    },
    {
      id: 'search',
      label: 'Acervo',
      icon: Search,
      onClick: () => setView('search'),
    },
    ...(currentUser
      ? [
          {
            id: 'messages',
            label: 'Mensagens',
            icon: MessageCircle,
            badge: unreadCount,
            onClick: () => setView('messages'),
          },
          {
            id: 'profile',
            label: 'Perfil',
            icon: User,
            onClick: () => onUserClick(currentUser),
          },
        ]
      : [
          {
            id: 'auth',
            label: 'Entrar',
            icon: LogIn,
            onClick: () => setView('auth'),
          },
        ]),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-t border-[#E7E2D8] px-2 py-1.5 shadow-[0_-4px_20px_rgba(31,28,24,0.06)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all min-w-[64px] ${
                active ? 'text-[#1E3A2F]' : 'text-[#8C8275]'
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-colors ${
                  active ? 'bg-[#E9EFEA]' : ''
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
              </div>
              <span
                className={`text-[11px] mt-0.5 ${
                  active ? 'font-semibold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
              {'badge' in item && item.badge && item.badge > 0 ? (
                <span className="absolute top-1 right-3 bg-[#A63D2D] text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// 2. PERFIL (OPERAÇÃO PUT /profile -> SALVA FOTO NO S3 E DADOS NO DYNAMODB)
const ProfileView = ({
  profileUser,
  currentUser,
  onSaveProfile,
  onSendMessage,
  reviews,
  onEditReview,
  onDeleteReview,
  onBack,
  onShowToast,
  onRequestConfirm,
}: {
  profileUser: any;
  currentUser: any;
  onSaveProfile: (user: any) => void;
  onSendMessage: (user: any) => void;
  reviews: any[];
  onEditReview: (
    reviewId: string,
    data: { rating: number; text: string }
  ) => void;
  onDeleteReview: (reviewId: string) => void;
  onBack: () => void;
  onShowToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onRequestConfirm: (
    title: string,
    message: string,
    onConfirm: () => void
  ) => void;
}) => {
  const isOwnProfile = currentUser && currentUser.id === profileUser.id;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profileUser.name);
  const [bio, setBio] = useState(profileUser.bio || '');
  const [avatar, setAvatar] = useState(profileUser.avatar || '');
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const [newImageType, setNewImageType] = useState<string>('image/jpeg');
  const [isSaving, setIsSaving] = useState(false);

  // Estado para edição de resenha dentro do perfil
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState('');

  const userReviews = reviews.filter(
    (review) => review.user.id === profileUser.id
  );

  const totalLikesReceived = userReviews.reduce(
    (acc, r) => acc + (r.likedBy?.length || 0),
    0
  );

  const averageRating =
    userReviews.length > 0
      ? (
          userReviews.reduce((acc, r) => acc + (r.rating || 0), 0) /
          userReviews.length
        ).toFixed(1)
      : '—';

  const startEditingReview = (review: any) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditText(review.text);
  };

  const cancelEditingReview = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditText('');
  };

  const saveEditedReview = (reviewId: string) => {
    if (editRating === 0 || !editText.trim()) {
      onShowToast('Preencha a nota e o texto da resenha!', 'error');
      return;
    }
    onEditReview(reviewId, { rating: editRating, text: editText.trim() });
    cancelEditingReview();
    onShowToast('Resenha atualizada com sucesso!', 'success');
  };

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
      onShowToast('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      onShowToast(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar dados no DynamoDB/S3.',
        'error'
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
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#5C554C] hover:text-[#1E3A2F] mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Voltar ao Feed</span>
      </button>

      {/* Cartão Ex-Libris do Leitor */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#E7E2D8] overflow-hidden mb-10">
        <div className="h-32 sm:h-40 bg-gradient-to-br from-[#1E3A2F] via-[#244638] to-[#162C23] relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(#FBF9F5 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="absolute right-6 bottom-4 hidden sm:flex items-center gap-2 text-[#FBF9F5]/40 font-serif-display italic text-lg select-none">
            <Feather size={16} />
            <span>Ex Libris • BookConnect</span>
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-7 relative">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end -mt-12 sm:-mt-14 mb-5 gap-4">
            <AvatarDisplay
              src={isEditing ? avatar : profileUser.avatar}
              alt={profileUser.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white bg-white shadow-md text-4xl"
            />

            <div className="flex flex-wrap gap-2">
              {isOwnProfile ? (
                isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-full text-sm font-medium text-[#5C554C] bg-[#F4F0E8] hover:bg-[#E7E2D8] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 bg-[#1E3A2F] text-[#FBF9F5] px-5 py-2 rounded-full text-sm font-medium hover:bg-[#284D3E] disabled:opacity-60 shadow-sm transition-colors"
                    >
                      <Save size={15} />
                      <span>{isSaving ? 'Salvando...' : 'Salvar Perfil'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 bg-[#F4F0E8] text-[#2C2824] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#E7E2D8] border border-[#E0D9CC] transition-colors"
                  >
                    <Edit3 size={15} />
                    <span>Editar Perfil</span>
                  </button>
                )
              ) : (
                currentUser && (
                  <button
                    onClick={() => onSendMessage(profileUser)}
                    className="flex items-center gap-2 bg-[#1E3A2F] text-[#FBF9F5] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#284D3E] shadow-sm transition-colors"
                  >
                    <MessageCircle size={16} />
                    <span>Enviar Mensagem</span>
                  </button>
                )
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4 pt-2 border-t border-[#F4F0E8]">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C554C] mb-2">
                  Foto de Perfil (S3)
                </label>

                <input
                  type="file"
                  accept="image/jpeg, image/png"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-[#5C554C] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#E9EFEA] file:text-[#1E3A2F] hover:file:bg-[#DCE7DF] outline-none"
                />

                {avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatar('');
                      setNewImageBase64(null);
                    }}
                    className="text-xs text-[#A63D2D] mt-2 hover:underline font-medium"
                  >
                    Remover foto atual
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C554C] mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border-[#DCD5C9] bg-[#FBF9F5] border rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1E3A2F]/20 focus:border-[#1E3A2F] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C554C] mb-1.5">
                  Biografia Literária
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full border-[#DCD5C9] bg-[#FBF9F5] border rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1E3A2F]/20 focus:border-[#1E3A2F] outline-none transition-all"
                  placeholder="Conte um pouco sobre você, seus autores favoritos e o que gosta de ler..."
                />
              </div>
            </div>
          ) : (
            <div>
              <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-[#1F1C18]">
                {profileUser.name}
              </h1>
              {profileUser.email && (
                <p className="text-xs text-[#8C8275] mt-0.5">
                  {profileUser.email}
                </p>
              )}
              <p className="text-[#4A443D] text-sm sm:text-base mt-3 leading-relaxed max-w-2xl whitespace-pre-wrap break-words">
                {profileUser.bio || 'Nenhuma biografia informada.'}
              </p>

              {/* Faixa de Estatísticas do Leitor */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-6 pt-6 border-t border-[#EFECE4] max-w-md">
                <div>
                  <span className="font-serif-display text-2xl font-bold text-[#1E3A2F] block">
                    {userReviews.length}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-[#8C8275]">
                    Resenhas
                  </span>
                </div>
                <div>
                  <span className="font-serif-display text-2xl font-bold text-[#1E3A2F] block">
                    {totalLikesReceived}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-[#8C8275]">
                    Curtidas
                  </span>
                </div>
                <div>
                  <span className="font-serif-display text-2xl font-bold text-[#C28534] block">
                    {averageRating}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-[#8C8275]">
                    Nota Média
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estante de Resenhas do Usuário */}
      <div className="flex items-baseline justify-between mb-5 border-b border-[#E7E2D8] pb-3">
        <h3 className="font-serif-display text-2xl font-bold text-[#1F1C18]">
          Estante de {profileUser.name.split(' ')[0]}
        </h3>
        <span className="text-xs font-medium uppercase tracking-wider text-[#8C8275]">
          {userReviews.length}{' '}
          {userReviews.length === 1 ? 'publicação' : 'publicações'}
        </span>
      </div>

      {userReviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E2D8] p-10 text-center">
          <BookMarked className="h-10 w-10 text-[#D0C8BC] mx-auto mb-3" />
          <p className="text-[#5C554C] text-sm">
            Este leitor ainda não publicou nenhuma resenha.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {userReviews.map((review) => {
            const isEditingThis = editingReviewId === review.id;

            return (
              <div
                key={review.id}
                className="bg-white p-5 rounded-2xl border border-[#E7E2D8] flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow"
              >
                <img
                  src={review.book.cover}
                  alt="Capa"
                  className="w-16 h-24 object-cover rounded-lg shadow-md border border-[#E7E2D8] shrink-0 bg-[#F4F0E8]"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-serif-display font-bold text-lg text-[#1F1C18] leading-snug line-clamp-2">
                        {review.book.title}
                      </h4>
                      {!isEditingThis && (
                        <div className="mt-1">
                          <RatingStars rating={review.rating} />
                        </div>
                      )}
                    </div>

                    {isOwnProfile && !isEditingThis && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEditingReview(review)}
                          className="text-[#8C8275] hover:text-[#1E3A2F] hover:bg-[#EFECE4] p-1.5 rounded-lg transition-colors"
                          title="Editar resenha"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() =>
                            onRequestConfirm(
                              'Excluir resenha',
                              'Tem certeza que deseja excluir esta resenha?',
                              () => {
                                onDeleteReview(review.id);
                                onShowToast('Resenha excluída.', 'info');
                              }
                            )
                          }
                          className="text-[#8C8275] hover:text-[#A63D2D] hover:bg-[#FDF2F0] p-1.5 rounded-lg transition-colors"
                          title="Excluir resenha"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingThis ? (
                    <div className="mt-3 space-y-3">
                      <RatingStars
                        rating={editRating}
                        interactive
                        onRate={setEditRating}
                      />
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full border border-[#DCD5C9] bg-[#FBF9F5] rounded-xl p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1E3A2F]/20 focus:border-[#1E3A2F] outline-none resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEditedReview(review.id)}
                          className="flex items-center gap-1 bg-[#1E3A2F] text-white px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-[#284D3E]"
                        >
                          <Save size={13} />
                          <span>Salvar</span>
                        </button>
                        <button
                          onClick={cancelEditingReview}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#5C554C] bg-[#F4F0E8] hover:bg-[#E7E2D8]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ReviewText text={review.text} compact />
                      <span className="text-[11px] text-[#9A9083] mt-3 block">
                        Publicado em{' '}
                        {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 3. FEED EDITORIAL (LAYOUT EM 2 COLUNAS NO DESKTOP + BUSCA + RESENHAS + COMENTÁRIOS + MODAL DE CURTIDAS)
const FeedView = ({
  currentUser,
  reviews,
  knownUsersMap,
  actions,
  onUserClick,
  onRequireAuth,
  onShowToast,
  onRequestConfirm,
  onGoToSearch,
  highlightedReviewId,
  onClearHighlightedReview,
}: {
  currentUser: any;
  reviews: any[];
  knownUsersMap: Map<string, any>;
  actions: any;
  onUserClick: (user: any) => void;
  onRequireAuth: () => void;
  onShowToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onRequestConfirm: (
    title: string,
    message: string,
    onConfirm: () => void
  ) => void;
  onGoToSearch: () => void;
  highlightedReviewId: string | null;
  onClearHighlightedReview: () => void;
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

  // Modal para visualizar quem curtiu uma resenha
  const [likesModalReview, setLikesModalReview] = useState<any | null>(null);

  // Estado para edição de resenha no feed
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState('');

  // Quando o usuário clica numa notificação de comentário/curtida, abre os comentários e rola até a resenha
  useEffect(() => {
    if (!highlightedReviewId) return;
    setActiveCommentReview(highlightedReviewId);

    const el = document.getElementById(`review-${highlightedReviewId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timer = window.setTimeout(() => {
      onClearHighlightedReview();
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [highlightedReviewId]);

  const startEditingReview = (review: any) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditText(review.text);
  };

  const cancelEditingReview = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditText('');
  };

  const saveEditedReview = (reviewId: string) => {
    if (editRating === 0 || !editText.trim()) {
      onShowToast('Preencha a nota e o texto da resenha!', 'error');
      return;
    }
    actions.onEditReview(reviewId, {
      rating: editRating,
      text: editText.trim(),
    });
    cancelEditingReview();
    onShowToast('Resenha atualizada com sucesso!', 'success');
  };

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

  // Resolve os dados completos de quem curtiu (a partir de likedUsers ou do mapa de usuários conhecidos)
  const getLikersList = (review: any) => {
    const likedIds: string[] = review.likedBy || [];
    const savedDetails: Record<string, any> = review.likedUsers || {};

    return likedIds.map((uid) => {
      if (currentUser && uid === currentUser.id) return currentUser;
      if (savedDetails[uid]) return savedDetails[uid];
      if (knownUsersMap.has(uid)) return knownUsersMap.get(uid);
      return {
        id: uid,
        name: 'Leitor do BookConnect',
        avatar: '',
        bio: '',
      };
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-10 px-4 sm:px-6">
      {/* Cabeçalho Editorial */}
      <div className="mb-8 pb-6 border-b border-[#E7E2D8] flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A6220] mb-2">
            <Sparkles size={13} />
            <span>Diário da Comunidade</span>
          </div>
          <h1 className="font-serif-display text-3xl sm:text-5xl font-bold text-[#1F1C18] tracking-tight leading-[1.1]">
            Explore mundos infinitos através de novas leituras.
          </h1>
          <p className="text-[#5C554C] text-sm sm:text-base mt-2.5 leading-relaxed">
            Compartilhe suas resenhas, avalie suas obras favoritas e conecte-se
            com mentes apaixonadas por literatura.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!currentUser && (
            <span className="bg-[#F6EBD9] text-[#8A5618] border border-[#E9D5B5] px-3.5 py-1.5 rounded-full text-xs font-semibold">
              Modo Visitante
            </span>
          )}
          <button
            type="button"
            onClick={onGoToSearch}
            className="inline-flex items-center gap-2 bg-[#1E3A2F] text-[#FBF9F5] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#284D3E] shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Nova Resenha</span>
          </button>
        </div>
      </div>

      {/* Grade Assimétrica: Feed Principal + Sidebar Editorial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Principal */}
        <div className="lg:col-span-8">
          {/* Barra de Pesquisa de Resenhas */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#8C8275]" />
              </div>

              <input
                type="text"
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                placeholder="Pesquisar resenhas por título, autor ou leitor..."
                className="w-full pl-11 pr-10 py-3 bg-white border border-[#E0D9CC] rounded-2xl text-sm text-[#1F1C18] placeholder-[#9A9083] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/15 focus:border-[#1E3A2F] transition-all"
              />

              {feedSearch && (
                <button
                  type="button"
                  onClick={() => setFeedSearch('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8C8275] hover:text-[#1F1C18]"
                  title="Limpar pesquisa"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {feedSearch.trim() && (
              <div className="mt-2.5 flex items-center justify-between text-xs text-[#6E665C] px-1">
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
                  className="text-[#1E3A2F] hover:underline font-semibold"
                >
                  Limpar filtro
                </button>
              </div>
            )}
          </div>

          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E7E2D8] p-12 text-center shadow-sm fade-in">
              <BookOpen className="h-11 w-11 text-[#D0C8BC] mx-auto mb-3" />
              <p className="font-serif-display text-xl font-bold text-[#1F1C18]">
                {feedSearch.trim()
                  ? 'Nenhuma resenha encontrada'
                  : 'O diário ainda está em branco'}
              </p>
              <p className="text-sm text-[#6E665C] mt-1.5 max-w-sm mx-auto">
                {feedSearch.trim()
                  ? 'Tente buscar por outro título, autor ou limpe a pesquisa para ver todo o feed.'
                  : 'Explore o acervo de livros para ser o primeiro a publicar uma resenha literária.'}
              </p>
              {feedSearch ? (
                <button
                  type="button"
                  onClick={() => setFeedSearch('')}
                  className="mt-5 bg-[#E9EFEA] text-[#1E3A2F] px-5 py-2 rounded-full text-sm font-medium hover:bg-[#DCE7DF] transition-colors"
                >
                  Ver todas as resenhas
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGoToSearch}
                  className="mt-5 bg-[#1E3A2F] text-[#FBF9F5] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#284D3E] transition-colors"
                >
                  Explorar Acervo
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredReviews.map((review) => {
                const hasLikedReview =
                  currentUser && review.likedBy.includes(currentUser.id);
                const isOwnReview =
                  currentUser && review.user.id === currentUser.id;
                const isEditingThis = editingReviewId === review.id;
                const isHighlighted = highlightedReviewId === review.id;

                return (
                  <article
                    id={`review-${review.id}`}
                    key={review.id}
                    className={`bg-white rounded-3xl shadow-sm border overflow-hidden transition-all fade-in ${
                      isHighlighted
                        ? 'border-[#1E3A2F] ring-2 ring-[#1E3A2F]/25'
                        : 'border-[#E7E2D8] hover:border-[#D8D0C2]'
                    }`}
                  >
                    <div className="p-5 sm:p-7">
                      {/* Cabeçalho do Card */}
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div
                          className="flex items-center gap-3 cursor-pointer group min-w-0"
                          onClick={() => onUserClick(review.user)}
                        >
                          <AvatarDisplay
                            src={review.user.avatar}
                            alt={review.user.name}
                            className="w-10 h-10 rounded-full border border-[#E7E2D8] group-hover:ring-2 group-hover:ring-[#1E3A2F]/20 transition-all"
                          />

                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-[#1F1C18] group-hover:text-[#1E3A2F] transition-colors truncate">
                              {review.user.name}
                            </h4>
                            <span className="text-xs text-[#8C8275] block">
                              Publicou uma resenha
                              {review.createdAt
                                ? ` • ${new Date(
                                    review.createdAt
                                  ).toLocaleDateString('pt-BR')}`
                                : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isEditingThis && (
                            <div className="bg-[#FBF9F5] border border-[#EFECE4] px-2.5 py-1 rounded-full">
                              <RatingStars rating={review.rating} />
                            </div>
                          )}

                          {isOwnReview && !isEditingThis && (
                            <div className="flex items-center gap-1 pl-1">
                              <button
                                onClick={() => startEditingReview(review)}
                                className="p-1.5 text-[#8C8275] hover:text-[#1E3A2F] hover:bg-[#EFECE4] rounded-full transition-colors"
                                title="Editar resenha"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() =>
                                  onRequestConfirm(
                                    'Excluir resenha',
                                    'Tem certeza que deseja excluir esta resenha?',
                                    () => {
                                      actions.onDeleteReview(review.id);
                                      onShowToast('Resenha excluída.', 'info');
                                    }
                                  )
                                }
                                className="p-1.5 text-[#8C8275] hover:text-[#A63D2D] hover:bg-[#FDF2F0] rounded-full transition-colors"
                                title="Excluir resenha"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Corpo Literário: Capa + Texto */}
                      <div className="flex flex-col sm:flex-row gap-5 mb-5 bg-[#FBF9F5] border border-[#EFECE4] p-4 sm:p-5 rounded-2xl">
                        <div className="flex sm:block justify-center shrink-0">
                          <img
                            src={review.book.cover}
                            alt={review.book.title}
                            className="w-24 h-36 sm:w-24 sm:h-36 object-cover rounded-lg shadow-[4px_6px_16px_rgba(31,28,24,0.14)] border border-[#E7E2D8] bg-white"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif-display font-bold text-2xl text-[#1F1C18] leading-tight">
                            {review.book.title}
                          </h3>
                          <p className="text-xs uppercase tracking-wider font-medium text-[#8C8275] mt-1 mb-3">
                            por {review.book.author}
                          </p>

                          {isEditingThis ? (
                            <div className="space-y-3 mt-2">
                              <div>
                                <span className="text-xs text-[#6E665C] block mb-1">
                                  Alterar nota:
                                </span>
                                <RatingStars
                                  rating={editRating}
                                  interactive
                                  onRate={setEditRating}
                                />
                              </div>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                className="w-full bg-white border border-[#DCD5C9] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#1E3A2F]/20 focus:border-[#1E3A2F] outline-none resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveEditedReview(review.id)}
                                  className="flex items-center gap-1.5 bg-[#1E3A2F] text-white px-4 py-1.5 rounded-full text-xs font-medium hover:bg-[#284D3E]"
                                >
                                  <Save size={13} />
                                  <span>Salvar alterações</span>
                                </button>
                                <button
                                  onClick={cancelEditingReview}
                                  className="px-4 py-1.5 rounded-full text-xs font-medium text-[#5C554C] bg-white border border-[#DCD5C9] hover:bg-[#F4F0E8]"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <ReviewText text={review.text} />
                          )}
                        </div>
                      </div>

                      {/* Barra de Interações */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#F4F0E8]">
                        <div className="flex items-center gap-2">
                          {/* Pill de Curtida: Coração curte/descurte, Número abre quem curtiu */}
                          <div
                            className={`inline-flex items-center rounded-full text-sm font-medium transition-all ${
                              hasLikedReview
                                ? 'bg-[#FDF2F0] text-[#A63D2D]'
                                : 'text-[#5C554C] hover:bg-[#F4F0E8]'
                            }`}
                          >
                            <button
                              type="button"
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
                              className="pl-3.5 pr-1.5 py-1.5 flex items-center hover:text-[#A63D2D] transition-colors cursor-pointer"
                            >
                              <Heart
                                size={17}
                                fill={hasLikedReview ? 'currentColor' : 'none'}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (review.likedBy.length > 0) {
                                  setLikesModalReview(review);
                                } else {
                                  onShowToast(
                                    'Esta resenha ainda não recebeu curtidas.',
                                    'info'
                                  );
                                }
                              }}
                              title={
                                review.likedBy.length > 0
                                  ? 'Ver quem curtiu'
                                  : 'Nenhuma curtida ainda'
                              }
                              className="pr-3.5 pl-1 py-1.5 hover:underline cursor-pointer"
                            >
                              {review.likedBy.length}
                            </button>
                          </div>

                          <button
                            onClick={() =>
                              setActiveCommentReview(
                                activeCommentReview === review.id
                                  ? null
                                  : review.id
                              )
                            }
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                              activeCommentReview === review.id
                                ? 'bg-[#E9EFEA] text-[#1E3A2F]'
                                : 'text-[#5C554C] hover:bg-[#F4F0E8] hover:text-[#1E3A2F]'
                            }`}
                          >
                            <MessageCircle size={17} />
                            <span>
                              {review.comments.length}{' '}
                              <span className="hidden sm:inline">
                                {review.comments.length === 1
                                  ? 'comentário'
                                  : 'comentários'}
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Seção de Comentários */}
                    {activeCommentReview === review.id && (
                      <div className="bg-[#FBF9F5] px-5 sm:px-7 py-5 border-t border-[#EFECE4]">
                        <div className="space-y-4 mb-4">
                          {review.comments.length === 0 && (
                            <p className="text-xs text-[#8C8275] italic text-center py-2">
                              Nenhum comentário ainda. Inicie a conversa sobre
                              esta obra!
                            </p>
                          )}

                          {review.comments.map((comment: any) => {
                            const hasLikedComment =
                              currentUser &&
                              comment.likedBy.includes(currentUser.id);

                            const isReplying =
                              currentUser &&
                              replyingTo?.commentId === comment.id;

                            const canDeleteComment =
                              currentUser &&
                              (comment.user.id === currentUser.id ||
                                review.user.id === currentUser.id);

                            return (
                              <div key={comment.id} className="text-sm">
                                <div className="flex items-start gap-2.5">
                                  <AvatarDisplay
                                    src={comment.user.avatar}
                                    alt={comment.user.name}
                                    className="w-8 h-8 rounded-full cursor-pointer border border-[#E7E2D8]"
                                    onClick={() => onUserClick(comment.user)}
                                  />

                                  <div className="flex-1 min-w-0">
                                    <div className="bg-white p-3 rounded-2xl border border-[#E7E2D8] shadow-2xs inline-block min-w-[60%] max-w-full">
                                      <span
                                        className="font-semibold text-xs text-[#1F1C18] cursor-pointer hover:text-[#1E3A2F]"
                                        onClick={() =>
                                          onUserClick(comment.user)
                                        }
                                      >
                                        {comment.user.name}
                                      </span>

                                      <p className="text-[#3A352F] text-sm mt-0.5 break-words [overflow-wrap:anywhere]">
                                        {comment.text}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-3.5 mt-1.5 ml-2 text-xs text-[#8C8275] font-medium">
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
                                            ? 'text-[#A63D2D]'
                                            : 'hover:text-[#1F1C18]'
                                        }`}
                                      >
                                        {hasLikedComment ? 'Curtiu' : 'Curtir'}{' '}
                                        ({comment.likedBy.length})
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
                                        className="hover:text-[#1F1C18]"
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
                                          className="flex items-center gap-1 text-[#9A9083] hover:text-[#A63D2D] transition-colors"
                                          title="Excluir comentário"
                                        >
                                          <Trash2 size={12} />
                                          <span>Excluir</span>
                                        </button>
                                      )}
                                    </div>

                                    {comment.replies.length > 0 && (
                                      <div className="mt-3 space-y-3 pl-4 border-l-2 border-[#E0D9CC]">
                                        {comment.replies.map((reply: any) => {
                                          const hasLikedReply =
                                            currentUser &&
                                            reply.likedBy.includes(
                                              currentUser.id
                                            );

                                          const canDeleteReply =
                                            currentUser &&
                                            (reply.user.id === currentUser.id ||
                                              review.user.id ===
                                                currentUser.id);

                                          return (
                                            <div
                                              key={reply.id}
                                              className="flex items-start gap-2"
                                            >
                                              <AvatarDisplay
                                                src={reply.user.avatar}
                                                alt={reply.user.name}
                                                className="w-6 h-6 rounded-full cursor-pointer text-[10px] border border-[#E7E2D8]"
                                                onClick={() =>
                                                  onUserClick(reply.user)
                                                }
                                              />

                                              <div className="min-w-0">
                                                <div className="bg-[#F4F0E8] p-2.5 rounded-2xl border border-[#E7E2D8] inline-block max-w-full">
                                                  <span
                                                    className="font-semibold text-[#1F1C18] text-xs cursor-pointer hover:text-[#1E3A2F]"
                                                    onClick={() =>
                                                      onUserClick(reply.user)
                                                    }
                                                  >
                                                    {reply.user.name}
                                                  </span>

                                                  <p className="text-[#3A352F] text-xs sm:text-sm mt-0.5 break-words [overflow-wrap:anywhere]">
                                                    {reply.text}
                                                  </p>
                                                </div>

                                                <div className="flex items-center gap-3 mt-1 ml-1.5 text-[11px] text-[#8C8275] font-medium">
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
                                                        ? 'text-[#A63D2D]'
                                                        : 'hover:text-[#1F1C18]'
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
                                                      className="flex items-center gap-1 text-[#9A9083] hover:text-[#A63D2D] transition-colors"
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
                                          className="flex-1 text-sm rounded-full border-[#DCD5C9] px-3.5 py-1.5 focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-none bg-white border"
                                          onKeyDown={(e) =>
                                            e.key === 'Enter' &&
                                            submitReply(review.id, comment.id)
                                          }
                                        />

                                        <button
                                          onClick={() =>
                                            submitReply(review.id, comment.id)
                                          }
                                          className="bg-[#1E3A2F] text-white rounded-full p-2 hover:bg-[#284D3E]"
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
                          <div className="flex gap-2.5 items-center mt-4 pt-3 border-t border-[#EFECE4]">
                            <AvatarDisplay
                              src={currentUser.avatar}
                              alt={currentUser.name}
                              className="w-8 h-8 rounded-full border border-[#E7E2D8]"
                            />

                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Escreva um comentário..."
                              className="flex-1 rounded-full bg-white border-[#DCD5C9] border px-4 py-2 text-sm focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-none"
                              onKeyDown={(e) =>
                                e.key === 'Enter' && submitComment(review.id)
                              }
                            />

                            <button
                              onClick={() => submitComment(review.id)}
                              className="bg-[#1E3A2F] text-white p-2.5 rounded-full hover:bg-[#284D3E] shadow-sm transition-colors"
                            >
                              <Send size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={onRequireAuth}
                            className="w-full text-center text-sm text-[#1E3A2F] font-medium mt-3 bg-white hover:bg-[#E9EFEA] py-2.5 px-4 rounded-xl border border-[#D8E2DB] transition-colors"
                          >
                            Faça login para curtir ou comentar nesta resenha
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Lateral Editorial (Desktop) */}
        <aside className="hidden lg:block lg:col-span-4 space-y-6 sticky top-24">
          {/* Card do Leitor ou Convite de Visitante */}
          <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 shadow-sm">
            {currentUser ? (
              <div>
                <div
                  className="flex items-center gap-3.5 cursor-pointer group"
                  onClick={() => onUserClick(currentUser)}
                >
                  <AvatarDisplay
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-12 h-12 rounded-2xl border border-[#E7E2D8] text-lg"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-[#9A6220] font-semibold">
                      Seu Espaço
                    </p>
                    <h3 className="font-serif-display font-bold text-xl text-[#1F1C18] truncate group-hover:text-[#1E3A2F]">
                      {currentUser.name}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-[#6E665C] mt-3 line-clamp-2 leading-relaxed">
                  {currentUser.bio ||
                    'Compartilhe suas impressões de leitura com a comunidade.'}
                </p>
                <button
                  type="button"
                  onClick={onGoToSearch}
                  className="w-full mt-4 bg-[#F4F0E8] hover:bg-[#1E3A2F] text-[#1E3A2F] hover:text-[#FBF9F5] font-medium text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Feather size={15} />
                  <span>Escrever nova resenha</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#F4F0E8] text-[#1E3A2F] flex items-center justify-center mb-3">
                  <BookMarked size={20} />
                </div>
                <h3 className="font-serif-display text-2xl font-bold text-[#1F1C18]">
                  Junte-se ao clube
                </h3>
                <p className="text-xs text-[#6E665C] mt-1.5 leading-relaxed">
                  Crie sua conta para avaliar livros, trocar mensagens diretas e
                  conversar com nosso curador literário de IA.
                </p>
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="w-full mt-4 bg-[#1E3A2F] text-[#FBF9F5] hover:bg-[#284D3E] font-medium text-sm py-2.5 rounded-xl transition-colors"
                >
                  Entrar ou Cadastrar
                </button>
              </div>
            )}
          </div>

          {/* Panorama da Comunidade */}
          <div className="bg-[#1E3A2F] text-[#FBF9F5] rounded-3xl p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#D8B584] font-semibold">
              Panorama do Clube
            </p>
            <h3 className="font-serif-display text-2xl font-bold mt-1">
              Vida Literária
            </h3>
            <div className="mt-5 pt-4 border-t border-white/15">
              <span className="font-serif-display text-4xl font-bold block leading-none">
                {reviews.length}
              </span>
              <span className="text-xs text-[#C7D3CC] mt-1.5 block">
                {reviews.length === 1
                  ? 'Resenha publicada na comunidade'
                  : 'Resenhas publicadas na comunidade'}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal: Lista de Leitores que Curtiram a Resenha */}
      {likesModalReview && (
        <div
          className="fixed inset-0 bg-[#1F1C18]/60 backdrop-blur-xs flex items-center justify-center p-4 z-[80] fade-in"
          onClick={() => setLikesModalReview(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#E7E2D8]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#EFECE4] bg-[#FBF9F5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart
                  size={17}
                  className="text-[#A63D2D]"
                  fill="currentColor"
                />
                <h3 className="font-serif-display font-bold text-xl text-[#1F1C18]">
                  Curtidas ({likesModalReview.likedBy.length})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setLikesModalReview(null)}
                className="text-[#8C8275] hover:text-[#1F1C18] p-1 rounded-full hover:bg-[#EFECE4]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#F4F0E8]">
              {getLikersList(likesModalReview).map((liker: any) => (
                <button
                  key={liker.id}
                  type="button"
                  onClick={() => {
                    setLikesModalReview(null);
                    onUserClick(liker);
                  }}
                  className="w-full px-6 py-3.5 flex items-center gap-3.5 hover:bg-[#FBF9F5] transition-colors text-left"
                >
                  <AvatarDisplay
                    src={liker.avatar}
                    alt={liker.name}
                    className="w-10 h-10 rounded-full border border-[#E7E2D8]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[#1F1C18] truncate">
                      {liker.name}
                    </p>
                    {liker.bio && (
                      <p className="text-xs text-[#8C8275] truncate mt-0.5">
                        {liker.bio}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#1E3A2F] shrink-0">
                    Ver perfil
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 4. BUSCA E API APPLE BOOKS (EM PORTUGUÊS + CAPAS MODERNAS HD + FALLBACK OPEN LIBRARY)
const SearchView = ({
  currentUser,
  onAddReview,
  onRequireAuth,
  onShowToast,
}: {
  currentUser: any;
  onAddReview: (review: any) => void;
  onRequireAuth: () => void;
  onShowToast: (text: string, type?: 'error' | 'success' | 'info') => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const runSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);

    try {
      // 1. Busca principal na Apple Books / iTunes API (Brasil, títulos em PT-BR e capas modernas HD)
      const appleRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          query
        )}&media=ebook&country=br&lang=pt_br&limit=15`
      );

      if (appleRes.ok) {
        const appleData = await appleRes.json();
        const items = appleData.results || [];

        if (items.length > 0) {
          const formattedApple = items.slice(0, 12).map((item: any) => {
            const title = item.trackName || 'Título desconhecido';
            const highResCover = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb', '600x600bb')
              : `https://placehold.co/300x450/F4F0E8/1E3A2F?text=${encodeURIComponent(
                  title.slice(0, 28)
                )}`;

            return {
              id: String(item.trackId || Math.random()),
              title,
              author: item.artistName || 'Autor Desconhecido',
              isbn: 'N/A',
              cover: highResCover,
            };
          });

          setResults(formattedApple);
          return;
        }
      }

      // 2. Fallback caso não encontre no catálogo Apple: Open Library filtrada para português
      const olRes = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(
          query
        )}&language=por&limit=12`
      );

      if (!olRes.ok) {
        throw new Error('Falha ao consultar acervos de livros');
      }

      const olData = await olRes.json();
      const formattedOl = (olData.docs || []).map((book: any) => ({
        id: book.key,
        title: book.title,
        author: book.author_name
          ? book.author_name.join(', ')
          : 'Autor Desconhecido',
        isbn: book.isbn ? book.isbn[0] : 'N/A',
        cover: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          : `https://placehold.co/300x450/F4F0E8/1E3A2F?text=${encodeURIComponent(
              (book.title || 'Sem Capa').slice(0, 28)
            )}`,
      }));

      setResults(formattedOl);
    } catch (error) {
      console.error('Erro na busca:', error);
      onShowToast('Erro ao consultar o acervo de livros.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(searchTerm);
  };

  const submitReview = () => {
    if (!currentUser) return;
    if (rating === 0 || !reviewText.trim()) {
      onShowToast('Preencha a nota e o texto da resenha!', 'error');
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
    onShowToast('Resenha publicada com sucesso!', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10 px-4 sm:px-6 fade-in">
      {/* Banner Editorial de Busca */}
      <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-10 shadow-sm mb-8 text-center">
        <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-[#9A6220] font-semibold mb-2">
          Acervo em Português • Apple Books
        </span>
        <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-[#1F1C18]">
          Explorar Acervo Literário
        </h2>
        <p className="text-sm text-[#6E665C] mt-2 max-w-lg mx-auto">
          Encontre obras clássicas e contemporâneas em português para registrar
          suas notas e impressões no BookConnect.
        </p>

        <form
          onSubmit={handleSearch}
          className="relative mt-6 max-w-2xl mx-auto flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#8C8275]" />
            </div>

            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3.5 border border-[#DCD5C9] rounded-2xl bg-[#FBF9F5] text-sm text-[#1F1C18] placeholder-[#9A9083] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/15 focus:border-[#1E3A2F] transition-all"
              placeholder="Busque por título, autor... (Ex: Dom Casmurro, É Assim que Acaba)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="bg-[#1E3A2F] text-[#FBF9F5] px-7 py-3.5 rounded-2xl font-medium text-sm hover:bg-[#284D3E] shadow-sm transition-colors shrink-0"
          >
            Buscar Obra
          </button>
        </form>

        {/* Sugestões Rápidas */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <span className="text-xs text-[#8C8275]">Sugestões:</span>
          {QUICK_SEARCH_SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSearchTerm(item);
                runSearch(item);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-[#F4F0E8] text-[#4A443D] hover:bg-[#E9EFEA] hover:text-[#1E3A2F] transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {isSearching ? (
        <div className="text-center py-16 text-[#6E665C]">
          <BookOpen className="h-9 w-9 mx-auto mb-3 text-[#1E3A2F] animate-pulse" />
          <p className="font-serif-display text-xl font-semibold text-[#1F1C18]">
            Consultando acervo literário...
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
          {results.map((book) => (
            <div
              key={book.id}
              className="bg-white rounded-3xl shadow-sm border border-[#E7E2D8] overflow-hidden flex flex-col hover:shadow-md hover:border-[#D5CCB9] transition-all"
            >
              <div className="h-56 overflow-hidden bg-[#F4F0E8] flex justify-center items-center p-5 relative">
                <img
                  src={book.cover}
                  alt={book.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://placehold.co/300x450/F4F0E8/1E3A2F?text=${encodeURIComponent(
                        book.title.slice(0, 28)
                      )}`;
                  }}
                  className="h-full object-contain rounded-md shadow-[4px_8px_18px_rgba(31,28,24,0.18)]"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3
                  className="font-serif-display font-bold text-xl text-[#1F1C18] line-clamp-2 leading-snug"
                  title={book.title}
                >
                  {book.title}
                </h3>

                <p className="text-xs uppercase tracking-wider text-[#8C8275] mt-1.5 mb-5 flex-1">
                  {book.author}
                </p>

                <div className="mt-auto pt-4 border-t border-[#F4F0E8]">
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        onRequireAuth();
                        return;
                      }
                      setSelectedBook(book);
                    }}
                    className="w-full py-2.5 rounded-xl font-medium text-sm transition-colors bg-[#F4F0E8] text-[#1E3A2F] hover:bg-[#1E3A2F] hover:text-[#FBF9F5]"
                  >
                    {currentUser
                      ? '+ Escrever Resenha'
                      : 'Faça login para avaliar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Modal de Avaliação */}
      {selectedBook && currentUser && (
        <div className="fixed inset-0 bg-[#1F1C18]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60] fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#E7E2D8]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#EFECE4] bg-[#FBF9F5]">
              <h3 className="font-serif-display font-bold text-2xl text-[#1F1C18]">
                Avaliar Obra
              </h3>

              <button
                onClick={() => setSelectedBook(null)}
                className="text-[#8C8275] hover:text-[#1F1C18] p-1 rounded-full hover:bg-[#EFECE4]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-4 mb-5 bg-[#FBF9F5] p-3.5 rounded-2xl border border-[#EFECE4]">
                <img
                  src={selectedBook.cover}
                  alt={selectedBook.title}
                  className="w-16 h-24 object-cover rounded-lg shadow-md shrink-0"
                />

                <div className="min-w-0">
                  <h4 className="font-serif-display font-bold text-xl text-[#1F1C18] leading-snug">
                    {selectedBook.title}
                  </h4>

                  <p className="text-xs uppercase tracking-wider text-[#8C8275] mt-0.5">
                    {selectedBook.author}
                  </p>

                  <div className="mt-3">
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
                placeholder="Compartilhe suas impressões, trechos marcantes ou o que esta leitura despertou em você..."
                className="w-full border border-[#DCD5C9] bg-[#FBF9F5] rounded-2xl p-4 h-36 resize-none text-sm focus:bg-white focus:ring-2 focus:ring-[#1E3A2F]/15 focus:border-[#1E3A2F] outline-none transition-all"
              />

              <button
                onClick={submitReview}
                className="w-full mt-4 bg-[#1E3A2F] text-[#FBF9F5] font-medium py-3 rounded-full hover:bg-[#284D3E] shadow-sm transition-colors"
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
  messageNotifications,
  onMessageNotificationsUpdated,
  onMarkContactRead,
  onShowToast,
  onUserClick,
}: {
  currentUser: any;
  contacts: any[];
  initialRecipient: any;
  messageNotifications: any[];
  onMessageNotificationsUpdated: (notifs: any[]) => void;
  onMarkContactRead: (contactId: string) => void;
  onShowToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onUserClick: (user: any) => void;
}) => {
  const [selectedContact, setSelectedContact] = useState<any>(
    initialRecipient || null
  );
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(
    Boolean(initialRecipient)
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialRecipient) {
      setSelectedContact(initialRecipient);
      setMobileShowChat(true);
    } else if (!selectedContact && contacts.length > 0) {
      const hasUnread = messageNotifications.some((n) => !n.read);
      if (!hasUnread) {
        setSelectedContact(contacts[0]);
      }
    }
  }, [initialRecipient, contacts]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          onMessageNotificationsUpdated(data.notifications);
        }
        onMarkContactRead(contactId);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      if (showLoader) setIsLoadingMsgs(false);
    }
  };

  useEffect(() => {
    if (!selectedContact) return;
    onMarkContactRead(selectedContact.id);
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
      } else {
        onShowToast('Não foi possível enviar a mensagem.', 'error');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      onShowToast(
        'Não foi possível enviar a mensagem. Tente novamente.',
        'error'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6 h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col fade-in">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="font-serif-display text-3xl font-bold text-[#1F1C18]">
            Correspondências
          </h2>
          <p className="text-xs sm:text-sm text-[#6E665C] mt-0.5">
            Converse diretamente com outros leitores do BookConnect.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-[#E7E2D8] overflow-hidden flex min-h-[400px]">
        {/* Lista de Perfis (ocultada no mobile quando o chat está aberto) */}
        <div
          className={`${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 border-r border-[#EFECE4] bg-[#FBF9F5] flex-col`}
        >
          <div className="px-4 py-3.5 border-b border-[#EFECE4] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6E665C]">
              Leitores da Comunidade
            </span>
            {messageNotifications.filter((n) => !n.read).length > 0 && (
              <span className="bg-[#A63D2D] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {messageNotifications.filter((n) => !n.read).length} nova(s)
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#F4F0E8]">
            {contacts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8C8275]">
                Nenhum outro leitor disponível no momento.
              </div>
            ) : (
              contacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id;
                const unreadFromContact = messageNotifications.filter(
                  (n) => !n.read && n.fromId === contact.id
                );
                const unreadCount = unreadFromContact.length;
                const lastUnread =
                  unreadCount > 0
                    ? unreadFromContact[unreadFromContact.length - 1]
                    : null;

                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      setMobileShowChat(true);
                      onMarkContactRead(contact.id);
                    }}
                    className={`w-full p-3.5 flex items-center gap-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#E9EFEA] border-r-4 border-[#1E3A2F]'
                        : unreadCount > 0
                        ? 'bg-[#F3F6F3] hover:bg-[#E9EFEA]/70'
                        : 'hover:bg-[#F4F0E8]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <AvatarDisplay
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-11 h-11 rounded-full text-sm border border-[#E7E2D8]"
                      />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#A63D2D] border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-sm truncate ${
                            unreadCount > 0
                              ? 'font-bold text-[#1F1C18]'
                              : 'font-semibold text-[#2C2824]'
                          }`}
                        >
                          {contact.name}
                        </p>
                        {unreadCount > 0 && (
                          <span className="bg-[#1E3A2F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {lastUnread ? (
                        <p className="text-xs font-medium text-[#1E3A2F] truncate mt-0.5">
                          “{lastUnread.text}”
                        </p>
                      ) : (
                        <p className="text-xs text-[#8C8275] truncate mt-0.5">
                          {contact.bio || 'Leitor do BookConnect'}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Área da Conversa */}
        <div
          className={`${
            mobileShowChat ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-white`}
        >
          {selectedContact ? (
            <>
              <div className="px-4 py-3 border-b border-[#EFECE4] bg-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden p-1.5 -ml-1 text-[#5C554C] hover:text-[#1E3A2F] hover:bg-[#F4F0E8] rounded-full shrink-0"
                    title="Voltar para contatos"
                  >
                    <ArrowLeft size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onUserClick(selectedContact)}
                    className="flex items-center gap-3 min-w-0 text-left group cursor-pointer rounded-xl p-1 -m-1 hover:bg-[#FBF9F5] transition-colors"
                    title={`Ver perfil de ${selectedContact.name}`}
                  >
                    <AvatarDisplay
                      src={selectedContact.avatar}
                      alt={selectedContact.name}
                      className="w-10 h-10 rounded-full border border-[#E7E2D8] group-hover:ring-2 group-hover:ring-[#1E3A2F]/20 transition-all"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#1F1C18] truncate group-hover:text-[#1E3A2F] group-hover:underline">
                        {selectedContact.name}
                      </p>
                      <p className="text-xs text-[#8C8275] truncate">
                        {selectedContact.bio || 'Leitor do BookConnect'}
                      </p>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onUserClick(selectedContact)}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#1E3A2F] bg-[#F4F0E8] hover:bg-[#E9EFEA] px-3 py-1.5 rounded-full transition-colors shrink-0"
                >
                  <User size={13} />
                  <span>Ver perfil</span>
                </button>
              </div>

              <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#FBF9F5] space-y-3">
                {isLoadingMsgs ? (
                  <div className="text-center text-[#8C8275] mt-10 text-sm">
                    Carregando conversa...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-[#8C8275] mt-12">
                    <MessageCircle
                      size={32}
                      className="mx-auto mb-2 opacity-40"
                    />
                    <p className="text-sm font-medium text-[#5C554C]">
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
                          className={`max-w-[82%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 shadow-2xs ${
                            isMine
                              ? 'bg-[#1E3A2F] text-[#FBF9F5] rounded-br-sm'
                              : 'bg-white border border-[#E7E2D8] text-[#2C2824] rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                            {msg.text}
                          </p>
                          <span
                            className={`text-[10px] block mt-1 text-right ${
                              isMine ? 'text-[#B5C7BC]' : 'text-[#9A9083]'
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
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 sm:p-4 bg-white border-t border-[#EFECE4]">
                <form
                  onSubmit={handleSendDirectMessage}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder={`Escreva para ${selectedContact.name}...`}
                    className="flex-1 bg-[#F4F0E8] border border-transparent focus:bg-white focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 rounded-full px-4 py-2.5 text-sm outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputMsg.trim() || isSending}
                    className="bg-[#1E3A2F] text-[#FBF9F5] p-2.5 px-4 rounded-full hover:bg-[#284D3E] disabled:opacity-50 transition-colors flex items-center justify-center"
                    title="Enviar mensagem"
                  >
                    <Send size={17} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#8C8275] text-sm p-6 text-center">
              <MessageCircle size={36} className="mb-2 opacity-35" />
              <p>Selecione um leitor à esquerda para iniciar a conversa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 6. CHATBOT FLUTUANTE (FAQ LOCAL PARA VISITANTES + WEBSOCKET/GEMINI PARA LOGADOS)
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
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2rem)] sm:w-[390px] h-[min(520px,72vh)] bg-white rounded-3xl shadow-2xl border border-[#E7E2D8] overflow-hidden flex flex-col fade-in">
          <div className="px-4 py-3.5 bg-[#1E3A2F] text-[#FBF9F5] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Bot size={19} />
              </div>
              <div>
                <p className="font-serif-display font-bold text-lg leading-tight">
                  Curador BookConnect
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !currentUser
                        ? 'bg-[#D8B584]'
                        : connectionStatus === 'connected'
                        ? 'bg-emerald-400'
                        : connectionStatus === 'connecting'
                        ? 'bg-amber-300'
                        : 'bg-red-400'
                    }`}
                  />
                  <span className="text-[11px] text-[#C7D3CC]">
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
                  className="text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full transition-colors"
                >
                  Reconectar
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#C7D3CC] hover:text-white p-1"
                title="Fechar chat"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-[#FBF9F5] space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-[#6E665C] mt-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] text-[#1E3A2F] flex items-center justify-center mx-auto mb-3">
                  <Bot size={24} />
                </div>
                {currentUser ? (
                  <>
                    <p className="font-serif-display font-bold text-lg text-[#1F1C18]">
                      Olá, {currentUser?.name?.split(' ')[0]}!
                    </p>
                    <p className="text-xs mt-1 text-[#6E665C]">
                      Peça recomendações literárias ou tire dúvidas com o
                      assistente do BookConnect.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-serif-display font-bold text-lg text-[#1F1C18]">
                      Bem-vindo ao BookConnect
                    </p>
                    <p className="text-xs mt-1 text-[#6E665C]">
                      Escolha uma pergunta abaixo para saber como o clube
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
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                      isUser
                        ? 'bg-[#1E3A2F] text-[#FBF9F5] rounded-br-sm'
                        : 'bg-white border border-[#E7E2D8] text-[#2C2824] rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.text}
                    </p>
                    <span
                      className={`text-[10px] block mt-1.5 text-right ${
                        isUser ? 'text-[#B5C7BC]' : 'text-[#9A9083]'
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
                <p className="text-[10px] font-semibold text-[#8C8275] uppercase tracking-wider">
                  Perguntas frequentes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GUEST_FAQ.map((faq) => (
                    <button
                      key={faq.question}
                      type="button"
                      onClick={() => handleFaqClick(faq)}
                      className="text-left text-xs bg-white hover:bg-[#E9EFEA] text-[#1E3A2F] border border-[#DCE4DE] rounded-xl px-3 py-1.5 transition-colors shadow-2xs"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isWaitingResponse && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E7E2D8] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-[#6E665C]">
                  Gemini está elaborando sua resposta...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {currentUser && connectionError && (
            <div className="px-3.5 py-2 bg-[#FDF2F0] border-t border-[#F5D6D0] text-xs text-[#A63D2D]">
              {connectionError}
            </div>
          )}

          <div className="p-3 bg-white border-t border-[#EFECE4]">
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
                  className="flex-1 bg-[#F4F0E8] border border-transparent focus:bg-white focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 rounded-full px-4 py-2 text-sm outline-none transition-all disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={
                    !inputMsg.trim() ||
                    connectionStatus !== 'connected' ||
                    isWaitingResponse
                  }
                  className="bg-[#1E3A2F] text-[#FBF9F5] p-2.5 rounded-full hover:bg-[#284D3E] disabled:opacity-50 transition-colors"
                  title="Enviar pergunta"
                >
                  <Send size={15} />
                </button>
              </form>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xs text-[#6E665C]">
                  Quer conversar livremente com a IA (Gemini) e pedir
                  recomendações?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onRequireAuth();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#1E3A2F] text-[#FBF9F5] text-xs font-semibold py-2.5 px-4 rounded-full hover:bg-[#284D3E] transition-colors"
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
        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1E3A2F] text-[#FBF9F5] shadow-lg hover:bg-[#284D3E] hover:scale-105 transition-all flex items-center justify-center ring-4 ring-[#FBF9F5]"
        title="Abrir Assistente (BookConnect)"
      >
        {isOpen ? <X size={22} /> : <Bot size={24} />}
      </button>
    </div>
  );
};

// 7. AUTH — AMAZON COGNITO (LAYOUT EDITORIAL SPLIT-CARD)
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
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-8 px-4 sm:px-6 fade-in">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-md border border-[#E7E2D8] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Painel Literário Decorativo */}
        <div className="md:col-span-5 bg-[#1E3A2F] text-[#FBF9F5] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(#FBF9F5 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
              <BookOpen size={22} />
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#D8B584] font-semibold">
              BookConnect
            </p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold mt-2 leading-tight">
              Onde cada página gera uma conversa.
            </h2>
          </div>

          <blockquote className="relative mt-8 pt-6 border-t border-white/15">
            <p className="font-serif-display italic text-lg text-[#E4ECE7] leading-relaxed">
              “Um leitor vive mil vidas antes de morrer. O homem que nunca lê
              vive apenas uma.”
            </p>
            <footer className="text-xs text-[#B5C7BC] mt-2">
              — George R. R. Martin
            </footer>
          </blockquote>
        </div>

        {/* Painel de Acesso Cognito */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[#9A6220] font-semibold">
            {isLogin ? 'Bem-vindo de volta' : 'Novo membro'}
          </span>
          <h3 className="font-serif-display text-3xl sm:text-4xl font-bold text-[#1F1C18] mt-1">
            {isLogin ? 'Acesse sua estante' : 'Crie sua conta'}
          </h3>
          <p className="text-sm text-[#6E665C] mt-2 leading-relaxed">
            {isLogin
              ? 'Entre para publicar resenhas, curtir comentários, enviar mensagens e conversar com nossa IA.'
              : 'Junte-se a uma comunidade apaixonada por livros e descobertas literárias.'}
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={handleAuthentication}
              disabled={isRedirecting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-full text-sm font-semibold text-[#FBF9F5] bg-[#1E3A2F] hover:bg-[#284D3E] shadow-sm transition-all disabled:opacity-60"
            >
              <LogIn size={17} />
              <span>
                {isRedirecting
                  ? 'Redirecionando...'
                  : isLogin
                  ? 'Entrar com Cognito'
                  : 'Cadastrar com Cognito'}
              </span>
            </button>

            {error && (
              <p className="text-[#A63D2D] text-xs mt-3 font-medium text-center">
                {error}
              </p>
            )}

            <div className="mt-7 text-center text-sm border-t border-[#EFECE4] pt-6">
              <span className="text-[#6E665C]">
                {isLogin ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
              </span>{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#1E3A2F] font-semibold hover:underline"
              >
                {isLogin ? 'Cadastre-se aqui' : 'Faça login'}
              </button>
            </div>

            <p className="text-[11px] text-[#9A9083] text-center mt-4">
              A autenticação e o cadastro são realizados com segurança pelo
              Amazon Cognito.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('feed');
  const [reviews, setReviews] = useState<any[]>([]);
  const [messageNotifications, setMessageNotifications] = useState<any[]>([]);
  const [activityNotifications, setActivityNotifications] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [highlightedReviewId, setHighlightedReviewId] = useState<string | null>(
    null
  );

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const [viewedUser, setViewedUser] = useState<any>(null);

  // Toast e Modal de Confirmação na própria tela (substituem alert e window.confirm do navegador)
  const [toast, setToast] = useState<{
    text: string;
    type: 'error' | 'success' | 'info';
  } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (
    text: string,
    type: 'error' | 'success' | 'info' = 'info'
  ) => {
    setToast({ text, type });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setConfirmModal({ title, message, onConfirm });
  };

  // --- CONTROLE DE NOTIFICAÇÕES LIDAS (PERSISTIDO NO LOCALSTORAGE POR USUÁRIO) ---
  const getReadNotifIds = (userId: string): string[] => {
    try {
      const saved = localStorage.getItem(`read_notifs_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveReadNotifIds = (userId: string, ids: string[]) => {
    try {
      localStorage.setItem(`read_notifs_${userId}`, JSON.stringify(ids));
    } catch {
      // ignora erro de storage
    }
  };

  const applyReadState = (rawNotifs: any[], userId?: string) => {
    if (!userId) return rawNotifs;
    const readIds = new Set(getReadNotifIds(userId));
    return rawNotifs.map((n) => (readIds.has(n.id) ? { ...n, read: true } : n));
  };

  const handleMessageNotificationsUpdated = (rawNotifs: any[]) => {
    const tagged = rawNotifs.map((n) => ({
      ...n,
      type: n.type || 'message',
    }));
    setMessageNotifications(applyReadState(tagged, currentUser?.id));
  };

  const handleMarkNotificationAsRead = (notifId: string) => {
    if (!currentUser) return;
    const currentIds = new Set(getReadNotifIds(currentUser.id));
    currentIds.add(notifId);
    saveReadNotifIds(currentUser.id, Array.from(currentIds));

    setMessageNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    setActivityNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const handleMarkContactNotificationsAsRead = (contactId: string) => {
    if (!currentUser) return;
    setMessageNotifications((prev) => {
      const currentIds = new Set(getReadNotifIds(currentUser.id));
      const updated = prev.map((n) => {
        if (n.fromId === contactId) {
          currentIds.add(n.id);
          return { ...n, read: true };
        }
        return n;
      });
      saveReadNotifIds(currentUser.id, Array.from(currentIds));
      return updated;
    });
  };

  const handleMarkAllNotificationsAsRead = () => {
    if (!currentUser) return;
    const currentIds = new Set(getReadNotifIds(currentUser.id));

    setMessageNotifications((prev) => {
      prev.forEach((n) => currentIds.add(n.id));
      saveReadNotifIds(currentUser.id, Array.from(currentIds));
      return prev.map((n) => ({ ...n, read: true }));
    });

    setActivityNotifications((prev) => {
      prev.forEach((n) => currentIds.add(n.id));
      saveReadNotifIds(currentUser.id, Array.from(currentIds));
      return prev.map((n) => ({ ...n, read: true }));
    });
  };

  // Carrega as resenhas, curtidas e comentários salvos no DynamoDB (público para visitantes)
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const res = await fetch(REVIEWS_API_URL, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews)) {
            setReviews(data.reviews);
          }
        }
      } catch (err) {
        console.log('Não foi possível carregar resenhas de /reviews.');
      }
    };

    loadReviews();
    const interval = setInterval(loadReviews, 15000);
    return () => clearInterval(interval);
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
      setMessageNotifications([]);
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
          handleMessageNotificationsUpdated(data.notifications || []);
        }
      } catch (err) {
        console.error('Erro ao buscar notificações:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Mapa com todos os usuários conhecidos (autores, comentaristas, curtidores)
  const knownUsersMap = React.useMemo(() => {
    const map = new Map<string, any>();

    reviews.forEach((r) => {
      if (r.user?.id) map.set(r.user.id, r.user);
      if (r.likedUsers && typeof r.likedUsers === 'object') {
        Object.values(r.likedUsers).forEach((u: any) => {
          if (u?.id) map.set(u.id, u);
        });
      }
      (r.comments || []).forEach((c: any) => {
        if (c.user?.id) map.set(c.user.id, c.user);
        (c.replies || []).forEach((rep: any) => {
          if (rep.user?.id) map.set(rep.user.id, rep.user);
        });
      });
    });

    messageNotifications.forEach((n) => {
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
      map.set(currentUser.id, currentUser);
    }

    return map;
  }, [reviews, messageNotifications, currentUser]);

  // Deriva notificações de curtidas e comentários feitas por outros leitores nas suas publicações
  useEffect(() => {
    if (!currentUser) {
      setActivityNotifications([]);
      return;
    }

    const derived: any[] = [];

    reviews.forEach((review) => {
      const bookTitle = review.book?.title || '';

      // 1. Curtidas na sua resenha
      if (review.user?.id === currentUser.id) {
        (review.likedBy || []).forEach((likerId: string) => {
          if (likerId === currentUser.id) return;
          const liker =
            review.likedUsers?.[likerId] || knownUsersMap.get(likerId);
          derived.push({
            id: `like_review_${review.id}_${likerId}`,
            type: 'like_review',
            fromId: likerId,
            fromName: liker?.name || 'Um leitor',
            fromAvatar: liker?.avatar || '',
            bookTitle,
            reviewId: review.id,
            text: '',
            createdAt: review.createdAt,
            read: false,
          });
        });

        // 2. Comentários na sua resenha
        (review.comments || []).forEach((comment: any) => {
          if (comment.user?.id && comment.user.id !== currentUser.id) {
            derived.push({
              id: `comment_${review.id}_${comment.id}`,
              type: 'comment',
              fromId: comment.user.id,
              fromName: comment.user.name || 'Um leitor',
              fromAvatar: comment.user.avatar || '',
              bookTitle,
              reviewId: review.id,
              text: comment.text,
              createdAt: comment.createdAt || '',
              read: false,
            });
          }
        });
      }

      // 3. Curtidas e respostas nos seus comentários
      (review.comments || []).forEach((comment: any) => {
        if (comment.user?.id === currentUser.id) {
          (comment.likedBy || []).forEach((likerId: string) => {
            if (likerId === currentUser.id) return;
            const liker = knownUsersMap.get(likerId);
            derived.push({
              id: `like_comment_${review.id}_${comment.id}_${likerId}`,
              type: 'like_comment',
              fromId: likerId,
              fromName: liker?.name || 'Um leitor',
              fromAvatar: liker?.avatar || '',
              bookTitle,
              reviewId: review.id,
              text: comment.text,
              createdAt: '',
              read: false,
            });
          });

          (comment.replies || []).forEach((reply: any) => {
            if (reply.user?.id && reply.user.id !== currentUser.id) {
              derived.push({
                id: `reply_${review.id}_${comment.id}_${reply.id}`,
                type: 'reply',
                fromId: reply.user.id,
                fromName: reply.user.name || 'Um leitor',
                fromAvatar: reply.user.avatar || '',
                bookTitle,
                reviewId: review.id,
                text: reply.text,
                createdAt: '',
                read: false,
              });
            }
          });
        }
      });
    });

    setActivityNotifications(applyReadState(derived, currentUser.id));
  }, [reviews, currentUser, knownUsersMap]);

  // Lista unificada de notificações (mensagens + curtidas + comentários)
  const allNotifications = React.useMemo(() => {
    return [...messageNotifications, ...activityNotifications];
  }, [messageNotifications, activityNotifications]);

  // Bloqueia acesso à aba de mensagens para visitantes não logados
  useEffect(() => {
    if (currentView === 'messages' && !currentUser && !authLoading) {
      setCurrentView('auth');
    }
  }, [currentView, currentUser, authLoading]);

  // Monta lista de perfis reais disponíveis para trocar mensagens (exclui o usuário atual)
  const availableContacts = React.useMemo(() => {
    const map = new Map<string, any>(knownUsersMap);
    if (currentUser?.id) {
      map.delete(currentUser.id);
    }
    return Array.from(map.values());
  }, [knownUsersMap, currentUser]);

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
    handleMarkNotificationAsRead(notif.id);

    if (notif.type && notif.type !== 'message') {
      setCurrentView('feed');
      if (notif.reviewId) {
        setHighlightedReviewId(notif.reviewId);
      }
      return;
    }

    handleMarkContactNotificationsAsRead(notif.fromId);

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
      setMessageNotifications([]);
      setActivityNotifications([]);
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

        if (updatedReview.likedUsers?.[updatedUser.id]) {
          updatedReview.likedUsers = {
            ...updatedReview.likedUsers,
            [updatedUser.id]: updatedUser,
          };
        }

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

  // --- LÓGICA DE RESENHAS, CURTIDAS E COMENTÁRIOS (APENAS LOGADOS + SALVANDO NO DYNAMODB) ---
  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value)
      ? arr.filter((item) => item !== value)
      : [...arr, value];

  const handleEditReview = (
    reviewId: string,
    { rating, text }: { rating: number; text: string }
  ) => {
    if (!currentUser) return;

    setReviews((prev) => {
      const updated = prev.map((review) =>
        review.id === reviewId && review.user.id === currentUser.id
          ? { ...review, rating, text }
          : review
      );
      persistReviews(updated);
      return updated;
    });
  };

  const handleDeleteReview = (reviewId: string) => {
    if (!currentUser) return;

    setReviews((prev) => {
      const updated = prev.filter(
        (review) =>
          !(review.id === reviewId && review.user.id === currentUser.id)
      );
      persistReviews(updated);
      return updated;
    });
  };

  const handleLikeReview = (reviewId: string) => {
    if (!currentUser) {
      setCurrentView('auth');
      return;
    }

    setReviews((prev) => {
      const updated = prev.map((review) => {
        if (review.id !== reviewId) return review;

        const alreadyLiked = review.likedBy.includes(currentUser.id);
        const nextLikedBy = toggleArray(review.likedBy, currentUser.id);
        const nextLikedUsers = { ...(review.likedUsers || {}) };

        if (alreadyLiked) {
          delete nextLikedUsers[currentUser.id];
        } else {
          nextLikedUsers[currentUser.id] = {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar || '',
            bio: currentUser.bio || '',
          };
        }

        return {
          ...review,
          likedBy: nextLikedBy,
          likedUsers: nextLikedUsers,
        };
      });
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
      likedUsers: {},
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

  const unreadMessagesCount = messageNotifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F5F1E9] font-body text-[#1F1C18] pb-24 md:pb-12 selection:bg-[#1E3A2F] selection:text-[#FBF9F5]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        .font-serif-display {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        .font-body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <Header
        currentUser={currentUser}
        currentView={currentView}
        setView={setCurrentView}
        handleLogout={handleLogout}
        onUserClick={handleUserClick}
        notifications={allNotifications}
        unreadMessagesCount={unreadMessagesCount}
        onOpenNotification={handleOpenNotification}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      />

      {/* Aviso Toast na própria tela */}
      {toast && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto z-[70] sm:max-w-sm w-auto sm:w-full fade-in">
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-[#FDF2F0] border-[#F2CBC4] text-[#8F2F21]'
                : toast.type === 'success'
                ? 'bg-[#EEF6F0] border-[#C6DFCD] text-[#1E3A2F]'
                : 'bg-[#FBF9F5] border-[#E0D9CC] text-[#2C2824]'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={17} className="shrink-0" />
              <span>{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="opacity-60 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação na própria tela */}
      {confirmModal && (
        <div className="fixed inset-0 bg-[#1F1C18]/60 backdrop-blur-xs flex items-center justify-center p-4 z-[80] fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-[#E7E2D8]">
            <h3 className="font-serif-display text-2xl font-bold text-[#1F1C18]">
              {confirmModal.title}
            </h3>
            <p className="text-sm text-[#5C554C] mt-2 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#5C554C] bg-[#F4F0E8] hover:bg-[#E7E2D8] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-5 py-2 rounded-full text-sm font-medium text-white bg-[#A63D2D] hover:bg-[#8C3123] transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        {authLoading ? (
          <div className="flex flex-col justify-center items-center py-24 text-[#6E665C] gap-3">
            <BookOpen className="h-8 w-8 text-[#1E3A2F] animate-pulse" />
            <span className="font-serif-display text-xl">
              Verificando sessão...
            </span>
          </div>
        ) : (
          <>
            {currentView === 'auth' && <AuthView error={authError} />}

            {currentView === 'feed' && (
              <FeedView
                currentUser={currentUser}
                reviews={reviews}
                knownUsersMap={knownUsersMap}
                onUserClick={handleUserClick}
                onRequireAuth={() => setCurrentView('auth')}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
                onGoToSearch={() => setCurrentView('search')}
                highlightedReviewId={highlightedReviewId}
                onClearHighlightedReview={() => setHighlightedReviewId(null)}
                actions={{
                  onEditReview: handleEditReview,
                  onDeleteReview: handleDeleteReview,
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
                onShowToast={showToast}
              />
            )}

            {currentView === 'messages' && currentUser && (
              <DirectMessagesView
                currentUser={currentUser}
                contacts={availableContacts}
                initialRecipient={selectedChatUser}
                messageNotifications={messageNotifications}
                onMessageNotificationsUpdated={
                  handleMessageNotificationsUpdated
                }
                onMarkContactRead={handleMarkContactNotificationsAsRead}
                onShowToast={showToast}
                onUserClick={handleUserClick}
              />
            )}

            {currentView === 'profile' && viewedUser && (
              <ProfileView
                profileUser={viewedUser}
                currentUser={currentUser}
                reviews={reviews}
                onSaveProfile={handleSaveProfile}
                onSendMessage={handleSendMessageClick}
                onEditReview={handleEditReview}
                onDeleteReview={handleDeleteReview}
                onBack={() => setCurrentView('feed')}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}
          </>
        )}
      </main>

      {/* Navegação Inferior para Celular */}
      <MobileBottomNav
        currentUser={currentUser}
        currentView={currentView}
        setView={setCurrentView}
        onUserClick={handleUserClick}
        unreadCount={unreadMessagesCount}
      />

      {/* Chatbot flutuante — FAQ local para visitantes e IA (Gemini) para logados */}
      <FloatingChatbot
        currentUser={currentUser}
        onRequireAuth={() => setCurrentView('auth')}
      />
    </div>
  );
}