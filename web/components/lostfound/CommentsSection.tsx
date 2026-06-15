"use client";

// Khu vực bình luận dưới tin — danh sách + ô soạn (cần đăng nhập).
import { useRef, useState } from "react";
import Link from "next/link";
import { CharCount } from "@/components/common/CharCount";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { TimeAgo } from "@/components/common/TimeAgo";
import { useToast } from "@/components/common/Toast";

export type CommentItem = {
  id: string;
  userName: string;
  content: string;
  createdAt: string; // ISO
  mine: boolean;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(-2).join("").toUpperCase() || "?";
}

type Props = { slug: string; initial: CommentItem[]; isLoggedIn: boolean; currentUserName?: string; apiBase?: string };

export function CommentsSection({ slug, initial, isLoggedIn, currentUserName, apiBase = "/api/lost-found" }: Props) {
  const [items, setItems] = useState<CommentItem[]>(initial);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/${slug}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, recaptchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      captcha.current?.reset();
      if (!res.ok) { toast.error(data.error || "Gửi bình luận thất bại."); return; }
      setItems((cur) => [data.item, ...cur]);
      setContent("");
    } catch { toast.error("Lỗi kết nối."); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Xoá bình luận này?")) return;
    try {
      const res = await fetch(`${apiBase}/${slug}/comments/${id}`, { method: "DELETE" });
      if (res.ok) setItems((cur) => cur.filter((c) => c.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <section id="comments" className="qp-comments">
      <h2 className="qp-comments__head">Bình luận <span className="qp-comments__count">{items.length}</span></h2>

      {isLoggedIn ? (
        <form className="qp-comment-form" onSubmit={submit}>
          <span className="qp-avatar-initials" aria-hidden>{initials(currentUserName || "?")}</span>
          <div className="qp-comment-form__main">
            <textarea className="qp-textarea qp-comment-form__input" rows={3} maxLength={1000}
              placeholder="Viết bình luận của bạn…" value={content} onChange={(e) => setContent(e.target.value)} />
            <Recaptcha ref={captcha} className="qp-recaptcha" />
            <div className="qp-comment-form__foot">
              <span className="qp-comment-form__hint"><CharCount value={content} max={1000} /></span>
              <button type="submit" className="qp-btn-primary" disabled={busy || !content.trim()}>
                {busy ? "Đang gửi…" : "Gửi bình luận"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="qp-comment-login">
          <span>Hãy <Link href="/dang-nhap">đăng nhập</Link> để bình luận.</span>
        </div>
      )}

      {items.length === 0 ? (
        <p className="qp-comments__empty">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
      ) : (
        <ul className="qp-comment-list">
          {items.map((c) => (
            <li key={c.id} className="qp-comment">
              <span className="qp-avatar-initials" aria-hidden>{initials(c.userName)}</span>
              <div className="qp-comment__body">
                <div className="qp-comment__top">
                  <b className="qp-comment__name">{c.userName}</b>
                  <TimeAgo iso={c.createdAt} className="qp-comment__time" />
                  {c.mine && (
                    <button type="button" className="qp-comment__del" onClick={() => remove(c.id)} aria-label="Xoá bình luận">Xoá</button>
                  )}
                </div>
                <p className="qp-comment__text">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
