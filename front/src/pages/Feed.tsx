import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Trash2, X, Image as ImageIcon, Users } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  fetchFeedPosts,
  createFeedPost,
  deleteFeedPost,
  toggleFeedReaction,
  fetchFeedComments,
  createFeedComment,
  deleteFeedComment,
  type FeedPost,
  type FeedComment,
} from '../lib/supabaseData';
import { formatDateTime } from '../lib/utils';

const DEFAULT_AVATAR = '/acordito.png';

const Avatar = ({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) => {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return src ? (
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size }}
      className="rounded-full object-cover border border-white/10 shrink-0"
      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-300 font-bold shrink-0 text-sm"
    >
      {initials || '?'}
    </div>
  );
};

const CommentSection = ({
  postId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: {
  postId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
}) => {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedComments(postId).then((data) => { setComments(data); setLoading(false); });
  }, [postId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    await createFeedComment(postId, currentUserId, input.trim());
    const fresh = await fetchFeedComments(postId);
    setComments(fresh);
    setInput('');
    setSending(false);
  };

  return (
    <div className="mt-3 border-t border-white/5 pt-3 space-y-3">
      {loading ? (
        <p className="text-xs text-zinc-500">Carregando comentários...</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {comments.length === 0 && (
            <p className="text-xs text-zinc-500">Nenhum comentário ainda. Seja o primeiro!</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar src={c.author_avatar} name={c.author_name} size={28} />
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl rounded-tl-none bg-white/5 px-3 py-2">
                  <p className="text-[11px] font-semibold text-orange-300 mb-0.5">{c.author_name}</p>
                  <p className="text-sm text-zinc-200 leading-relaxed break-words">{c.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-2">
                  <span className="text-[10px] text-zinc-500">{formatDateTime(c.created_at)}</span>
                  {c.user_id === currentUserId && (
                    <button
                      onClick={async () => {
                        await deleteFeedComment(c.id);
                        setComments((prev) => prev.filter((x) => x.id !== c.id));
                      }}
                      className="text-[10px] text-zinc-600 hover:text-rose-400 transition-colors"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Avatar src={currentUserAvatar} name={currentUserName} size={28} />
        <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escreva um comentário..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const PostCard = ({
  post,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onDelete,
}: {
  post: FeedPost;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
  onDelete: (id: string) => void;
}) => {
  const [reacted, setReacted] = useState(post.user_reacted);
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);

  const handleReaction = async () => {
    const next = !reacted;
    setReacted(next);
    setReactionCount((prev) => prev + (next ? 1 : -1));
    await toggleFeedReaction(post.id, currentUserId, reacted);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar src={post.author_avatar} name={post.author_name} size={40} />
          <div>
            <p className="text-sm font-semibold text-white leading-none">{post.author_name}</p>
            {post.author_sector && (
              <span className="mt-1 inline-block rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                {post.author_sector}
              </span>
            )}
            <p className="mt-0.5 text-[10px] text-zinc-500">{formatDateTime(post.created_at)}</p>
          </div>
        </div>
        {post.user_id === currentUserId && (
          <button
            onClick={async () => { await deleteFeedPost(post.id); onDelete(post.id); }}
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">{post.content}</p>

      {post.image_url && (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
          <img src={post.image_url} alt="Imagem do post" className="w-full object-cover max-h-96" />
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-white/5 pt-3">
        <button
          onClick={handleReaction}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            reacted ? 'text-rose-400' : 'text-zinc-500 hover:text-rose-400'
          }`}
        >
          <Heart size={16} fill={reacted ? 'currentColor' : 'none'} />
          <span>{reactionCount > 0 ? reactionCount : ''} {reactionCount === 1 ? 'Curtida' : reactionCount > 1 ? 'Curtidas' : 'Curtir'}</span>
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-orange-400 transition-colors"
        >
          <MessageCircle size={16} />
          <span>{commentCount > 0 ? commentCount : ''} {commentCount === 1 ? 'Comentário' : commentCount > 1 ? 'Comentários' : 'Comentar'}</span>
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CommentSection
              postId={post.id}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const Feed = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentUserId = user?.id || '';
  const currentUserName = profile?.displayName || profile?.email?.split('@')[0] || 'Você';
  const currentUserAvatar = profile?.avatarUrl || null;

  useEffect(() => {
    if (!user) return;
    fetchFeedPosts(user.id).then((data) => { setPosts(data); setLoading(false); });

    // Sem realtime (Supabase Realtime nao existe mais): atualiza por polling.
    const interval = setInterval(() => {
      fetchFeedPosts(user.id).then(setPosts).catch(() => {});
    }, 20_000);

    return () => clearInterval(interval);
  }, [user]);

  const handlePost = async () => {
    if (!newPost.trim() || posting || !user) return;
    setPosting(true);
    setError('');
    try {
      await createFeedPost(user.id, newPost.trim());
      setNewPost('');
      const fresh = await fetchFeedPosts(user.id);
      setPosts(fresh);
    } catch {
      setError('Não foi possível publicar. Tente novamente.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6 px-4">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Feed da Equipe</h1>
          <p className="text-xs text-zinc-500">Compartilhe novidades, conquistas e atualizações com o time</p>
        </div>
      </header>

      {/* Caixa de publicação */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4">
        <div className="flex gap-3">
          <Avatar src={currentUserAvatar} name={currentUserName} size={40} />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost(); }}
              placeholder={`O que você quer compartilhar, ${currentUserName.split(' ')[0]}?`}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
            {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10px] text-zinc-600">Ctrl+Enter para publicar</p>
              <button
                onClick={handlePost}
                disabled={!newPost.trim() || posting}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
                {posting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/10 bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
            <Users size={28} />
          </div>
          <h3 className="text-lg font-semibold text-white">Nenhuma publicação ainda</h3>
          <p className="mt-2 text-sm text-zinc-500">Seja o primeiro a compartilhar algo com o time!</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};
