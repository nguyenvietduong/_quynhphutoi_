import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, incrementViews, relatedPosts } from "@/lib/lostfound";
import { likeInfo, listComments } from "@/lib/lostfound-social";
import { getCurrentUser } from "@/lib/admin";
import { isStaff } from "@/lib/users";
import { stripHtml } from "@/lib/strip-html";
import { cldHtml } from "@/lib/cloudinary-url";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { ResolveButton } from "@/components/lostfound/ResolveButton";
import { PostInteractions } from "@/components/lostfound/PostInteractions";
import { CommentsSection, type CommentItem } from "@/components/lostfound/CommentsSection";
import { ImageGallery } from "@/components/common/ImageGallery";
import { MapEmbed } from "@/components/common/MapEmbed";
import { formatDate } from "@/lib/datetime";
import { buildMetadata, jsonLdLostFound, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";
import { AffiliateCTA } from "@/components/common/AffiliateCTA";

export const dynamic = "force-dynamic";

const KIND_LABEL = { "tim-do": "Tìm đồ", "nhat-duoc": "Nhặt được" } as const;

// Nhãn trạng thái theo ngữ cảnh loại tin (tìm đồ vs nhặt được).
function statusLabel(status: "open" | "matched" | "resolved" | "closed", kind: "tim-do" | "nhat-duoc") {
  if (status === "open") return kind === "tim-do" ? "Đang tìm kiếm" : "Đang chờ trả lại";
  if (status === "matched") return "Đang xác minh";
  if (status === "resolved") return kind === "tim-do" ? "Đã tìm thấy" : "Đã trả lại";
  return "Đã đóng";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(-2).join("").toUpperCase() || "?";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Không tìm thấy tin" };
  return buildMetadata({
    ...applySeo({
      title: `${post.title} — ${post.kind === "tim-do" ? "Tìm đồ" : "Nhặt được"}`,
      description: stripHtml(post.description).slice(0, 160),
      image: post.images?.[0],
    }, post.seo),
    path: `/tim-do-roi/${slug}`,
    type: "article",
    publishedTime: post.createdAt?.toISOString(),
    modifiedTime: post.updatedAt?.toISOString(),
    noindex: !post.approved || post.seo?.noindex,
  });
}

export default async function LostFoundDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || !post.active) notFound();

  const user = await getCurrentUser();
  const isOwner = !!user && user._id?.toString() === post.postedBy.toString();
  if (!post.approved && !isOwner && !isStaff(user)) notFound();

  if (post.approved && !isOwner) await incrementViews(slug);

  const showPhone = !post.contact.hidePhone || isOwner;
  const me = user?._id?.toString();
  const [{ count: likeCount, liked }, commentDocs, related, units] = await Promise.all([
    likeInfo(post._id!, me),
    listComments(post._id!),
    post.approved ? relatedPosts(slug, 3) : Promise.resolve([]),
    getAdminUnitsMap(),
  ]);
  const unit = units.get(post.location.wardSlug);
  const wardName = unit?.name ?? post.location.wardSlug;
  const commentItems: CommentItem[] = commentDocs.map((c) => ({
    id: c._id!.toString(),
    userName: c.userName,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    mine: !!me && me === c.userId.toString(),
  }));
  const lead = stripHtml(post.description).slice(0, 200);
  const newCommune = unit?.newCommune;

  return (
    <article>
      {post.approved && (
        <JsonLd data={[
          jsonLdLostFound(post, lead),
          jsonLdBreadcrumb([
            { name: "Trang chủ", path: "/" },
            { name: "Tìm đồ rơi", path: "/tim-do-roi" },
            { name: post.title, path: `/tim-do-roi/${slug}` },
          ]),
        ]} />
      )}
      {/* ── Hero banner ── */}
      <section className={`qp-pagehero qp-lf-hero is-${post.kind}`} aria-labelledby="lf-detail-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          {post.kind === "nhat-duoc" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" />
              <path d="M7 14h3l3.5 1.2a2 2 0 0 0 1.6-.1l4.5-2.3a1.4 1.4 0 0 0-1.2-2.5L16 11.6" />
              <path d="M16 11.6 12.7 10a3 3 0 0 0-2.2 0L7 11.4" /><circle cx="13" cy="5" r="2.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
          )}
        </span>
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/tim-do-roi">Tìm đồ rơi</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{post.title}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className={`qp-lf-kind is-${post.kind}`}>{KIND_LABEL[post.kind]}</span>
            <span className="qp-tag-cat">{post.categoryName}</span>
            {post.status !== "open" && <span className={`qp-lf-status is-${post.status}`}>{statusLabel(post.status, post.kind)}</span>}
            {!post.approved && <span className="qp-lf-status is-pending">⏳ Chờ duyệt</span>}
          </div>
          <h1 id="lf-detail-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-4)" }}>{post.title}</h1>
          {lead && <p className="qp-pagehero__lead">{lead}</p>}
          <div className="qp-author">
            <span className="qp-avatar-initials" aria-hidden>{initials(post.postedByName)}</span>
            <div>
              <div className="qp-author__name">{post.postedByName}</div>
              <div className="qp-author__meta">{post.kind === "tim-do" ? "Mất" : "Nhặt được"} ngày {formatDate(post.occurredAt)} · {post.views} lượt xem</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        {!post.approved && (
          <div className="qp-alert is-warning" role="status" style={{ maxWidth: 820, marginBottom: "var(--space-6)" }}>
            <div className="qp-alert__body"><strong>Tin đang chờ duyệt.</strong> Chỉ bạn (người đăng) và quản trị viên xem được. Sau khi duyệt, tin sẽ hiển thị công khai.</div>
          </div>
        )}

        {/* ── Bố cục 2 cột: nội dung trái · thông tin/liên hệ phải (sticky) ── */}
        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <ImageGallery images={post.images} alt={post.title} />

            <div className="rich-text-editor__content qp-rte-view" dangerouslySetInnerHTML={{ __html: cldHtml(post.description) }} />

            {post.location.mapUrl && (
              <div style={{ marginTop: "var(--space-6)" }}>
                <MapEmbed url={post.location.mapUrl} address={post.location.address} />
              </div>
            )}

            <AffiliateCTA />

            <PostInteractions slug={post.slug} title={post.title} initialLiked={liked}
              initialLikeCount={likeCount} commentCount={commentItems.length} isLoggedIn={!!user} />

            <CommentsSection slug={post.slug} initial={commentItems} isLoggedIn={!!user} currentUserName={user?.name} />
          </div>

          <aside className="qp-lf-aside">
            {/* Liên hệ — CTA chính */}
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              <div className="qp-lf-infocard__title">Liên hệ {post.kind === "tim-do" ? "người mất" : "người nhặt được"}</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Người đăng</span><b>{post.contact.name}</b></div>
                <div className="qp-lf-spec__row">
                  <span>Điện thoại</span>
                  {showPhone ? <b><a href={`tel:${post.contact.phone}`}>{post.contact.phone}</a></b> : <b><i style={{ fontWeight: 400 }}>Đã ẩn</i></b>}
                </div>
                {post.contact.email && showPhone && (
                  <div className="qp-lf-spec__row"><span>Email</span><b><a href={`mailto:${post.contact.email}`}>{post.contact.email}</a></b></div>
                )}
              </div>
              {showPhone && !isOwner && <a href={`tel:${post.contact.phone}`} className="qp-btn-primary qp-btn-block mt-6">Gọi ngay</a>}
              {isOwner && <p className="type-body-small text-muted mt-4" style={{ margin: "12px 0 0" }}>Đây là thông tin liên hệ hiển thị cho người xem.</p>}
            </div>

            {/* Chi tiết tin */}
            <div className="qp-lf-infocard">
              <div className="qp-lf-infocard__title">Chi tiết</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Loại tin</span><b>{KIND_LABEL[post.kind]}</b></div>
                <div className="qp-lf-spec__row"><span>Danh mục</span><b>{post.categoryName}</b></div>
                <div className="qp-lf-spec__row"><span>Địa điểm</span><b>{wardName}{post.location.address && `, ${post.location.address}`}{newCommune && <><br /><span className="qp-lf-spec__sub">(Xã mới: {newCommune})</span></>}</b></div>
                {post.location.address && <div className="qp-lf-spec__row"><span>Vị trí</span><b>{post.location.address}</b></div>}
                <div className="qp-lf-spec__row"><span>{post.kind === "tim-do" ? "Ngày mất" : "Ngày nhặt"}</span><b>{formatDate(post.occurredAt)}</b></div>
                {post.kind === "tim-do" && post.reward && <div className="qp-lf-spec__row"><span>Hậu tạ</span><b style={{ color: "#b45309" }}>{post.reward}</b></div>}
                <div className="qp-lf-spec__row"><span>Trạng thái</span><b>{statusLabel(post.status, post.kind)}</b></div>
              </div>
            </div>

            {/* Hành động chủ tin */}
            {isOwner && post.status !== "resolved" && (
              <div className="qp-lf-infocard">
                <p className="type-body-small text-muted" style={{ marginBottom: 10 }}>Bạn là người đăng tin này.</p>
                <ResolveButton slug={post.slug} kind={post.kind} />
              </div>
            )}
          </aside>
        </div>

        {/* ── Tin liên quan ── */}
        {related.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head">
              <span className="type-tag qp-sechead__eyebrow">Cùng danh mục</span>
              <h2 className="type-h2">Tin liên quan</h2>
            </header>
            <div className="grid grid-3">
              {related.map((r) => (
                <article className="qp-mesh-card qp-mesh-card--text" key={r.slug}>
                  <div className="qp-mesh-card__body">
                    <div className="qp-lf-detail__badges">
                      <span className={`qp-lf-kind is-${r.kind}`}>{KIND_LABEL[r.kind]}</span>
                      <span className="qp-tag-cat">{r.categoryName}</span>
                    </div>
                    <Link className="qp-lf-card__name" href={`/tim-do-roi/${r.slug}`}>{r.title}</Link>
                    <div className="qp-lf-card__row" style={{ marginTop: 6 }}>📍 {units.get(r.location.wardSlug)?.name ?? r.location.wardSlug}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
