import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BLOG_PLACEHOLDER_SLUG,
  getBlogPost,
  getBlogPosts,
  translatedBlogSlugs,
  type BlogPost,
} from "@/blog/posts";
import { JsonLd } from "@/components/json-ld";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { getSiteUrl, SITE } from "@/config/site";
import { fmtDate, HTML_LANG, paths, tr, type Locale } from "@/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

/**
 * Blog: /blog/ and /blog/{slug}/, German under /de/blog/.
 * Posts are Markdown files in /content/blog (see src/blog/parse.ts).
 * A post has a German page only if a German file exists; same slug in both languages.
 */

const longDate = (locale: Locale, iso: string) =>
  fmtDate(locale, `${iso}T12:00:00Z`, { day: "numeric", month: "long", year: "numeric" });

function hasTranslation(slug: string): boolean {
  return translatedBlogSlugs().includes(slug);
}

export function blogIndexMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: tr(locale, "Blog: football analysis and rankings", "Blog: Fußballanalysen und Rankings"),
    description: tr(
      locale,
      "Analysis of Europe's top football leagues built on the Footiqra power ranking: league comparisons, biggest movers, explainers and predictions.",
      "Analysen der Topligen Europas auf Basis des Footiqra Power-Rankings: Ligavergleiche, größte Aufsteiger, Erklärartikel und Prognosen.",
    ),
    paths: { en: paths("en").blog, de: paths("de").blog },
    image: ogImage.blog,
    // An empty index has nothing to rank for.
    noIndex: getBlogPosts(locale).length === 0,
  });
}

function PostCard({ post, locale }: { post: BlogPost; locale: Locale }) {
  const p = paths(post.locale);
  const t = (en: string, de: string) => tr(locale, en, de);
  const otherLanguage = post.locale !== locale;
  return (
    <li>
      <Link
        href={p.blogPost(post.slug)}
        hrefLang={otherLanguage ? HTML_LANG[post.locale] : undefined}
        className="group block rounded-3xl bg-surface p-6 transition hover:bg-surface-strong sm:p-8"
      >
        <p className="text-sm text-muted">
          <time dateTime={post.published}>{longDate(locale, post.published)}</time>
          {" · "}
          {post.readingMinutes} {t("min read", "Min. Lesezeit")}
          {otherLanguage && ` · ${t("English", "Englisch")}`}
        </p>
        <h2
          lang={otherLanguage ? HTML_LANG[post.locale] : undefined}
          className="mt-3 font-display text-2xl font-extrabold tracking-[-0.02em] group-hover:underline sm:text-3xl"
        >
          {post.title}
        </h2>
        <p lang={otherLanguage ? HTML_LANG[post.locale] : undefined} className="mt-3 text-muted">
          {post.description}
        </p>
      </Link>
    </li>
  );
}

export function BlogIndexView({ locale }: { locale: Locale }) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const posts = getBlogPosts(locale);
  // German readers also see English posts that have no translation yet.
  const untranslated =
    locale === "de" ? getBlogPosts("en").filter((post) => !hasTranslation(post.slug)) : [];
  return (
    <div className="max-w-3xl space-y-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: "Blog", path: p.blog },
        ])}
      />
      <header className="space-y-5">
        <Eyebrow>Blog</Eyebrow>
        <h1 className="font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-7xl">
          {t("Football analysis", "Fußballanalysen")}
        </h1>
        <p className="text-xl text-muted">
          {t(
            "What the power ranking says about Europe's top leagues: league comparisons, the biggest movers, predictions and how the numbers work.",
            "Was das Power-Ranking über die Topligen Europas verrät: Ligavergleiche, die größten Aufsteiger, Prognosen und wie die Zahlen entstehen.",
          )}
        </p>
      </header>

      {posts.length > 0 && (
        <ul className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} />
          ))}
        </ul>
      )}

      {untranslated.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Auf Englisch</h2>
          <ul className="space-y-4">
            {untranslated.map((post) => (
              <PostCard key={post.slug} post={post} locale={locale} />
            ))}
          </ul>
        </section>
      )}

      {posts.length === 0 && untranslated.length === 0 && (
        <p className="rounded-3xl bg-surface p-6 text-muted">
          {t("The first articles are on their way.", "Die ersten Beiträge sind in Arbeit.")}
        </p>
      )}
    </div>
  );
}

export function blogStaticParams(locale: Locale): { slug: string }[] {
  const posts = getBlogPosts(locale);
  return posts.length > 0
    ? posts.map((post) => ({ slug: post.slug }))
    : [{ slug: BLOG_PLACEHOLDER_SLUG }];
}

export function blogPostMetadata(locale: Locale, slug: string): Metadata {
  const post = getBlogPost(locale, slug);
  if (!post) return {};
  const meta = pageMetadata({
    locale,
    title: post.title,
    description: post.description,
    path: paths(locale).blogPost(slug),
    paths: hasTranslation(slug)
      ? { en: paths("en").blogPost(slug), de: paths("de").blogPost(slug) }
      : undefined,
    image: ogImage.blogPost(slug),
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated,
    },
  };
}

function articleJsonLd(post: BlogPost) {
  const site = getSiteUrl();
  const url = `${site}${paths(post.locale).blogPost(post.slug)}`;
  const publisher = {
    "@type": "Organization",
    name: SITE.name,
    url: `${site}/`,
    logo: { "@type": "ImageObject", url: `${site}/icon.svg` },
  };
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.updated,
    inLanguage: HTML_LANG[post.locale],
    url,
    mainEntityOfPage: url,
    image: `${site}${ogImage.blogPost(post.slug)}`,
    author: publisher,
    publisher,
  };
}

function faqJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function BlogPostView({ locale, slug }: { locale: Locale; slug: string }) {
  const post = getBlogPost(locale, slug);
  if (!post) notFound();
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  return (
    <article className="max-w-3xl space-y-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("Home", "Startseite"), path: p.home },
          { name: "Blog", path: p.blog },
          { name: post.title, path: p.blogPost(post.slug) },
        ])}
      />
      <JsonLd data={articleJsonLd(post)} />
      {post.faq.length > 0 && <JsonLd data={faqJsonLd(post)} />}

      <header className="space-y-5">
        <Eyebrow>
          <Link href={p.blog} className="hover:underline">
            Blog
          </Link>
        </Eyebrow>
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">
          {post.title}
        </h1>
        <p className="text-xl text-muted">{post.description}</p>
        <p className="text-sm text-muted">
          <time dateTime={post.published}>{longDate(locale, post.published)}</time>
          {post.updated !== post.published && (
            <>
              {" · "}
              {t("Updated", "Aktualisiert")}{" "}
              <time dateTime={post.updated}>{longDate(locale, post.updated)}</time>
            </>
          )}
          {" · "}
          {post.readingMinutes} {t("min read", "Min. Lesezeit")}
        </p>
      </header>

      <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.html }} />

      <footer className="space-y-4 rounded-3xl border border-line p-6 sm:p-8">
        <p className="font-display text-2xl font-extrabold tracking-[-0.02em]">
          {t("See where every club stands today", "So stehen die Vereine heute")}
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={p.home}>{t("Power ranking", "Power-Ranking")}</ButtonLink>
          <ButtonLink href={p.blog} variant="secondary">
            {t("More articles", "Weitere Beiträge")}
          </ButtonLink>
        </div>
      </footer>
    </article>
  );
}
