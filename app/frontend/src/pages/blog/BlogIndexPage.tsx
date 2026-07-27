import { Link } from 'react-router-dom';
import { blogPosts, getBlogRoute } from '@/lib/blog';
import { useI18n } from '@/lib/i18n';
import { usePageMeta } from '@/hooks/use-page-meta';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/FooterSection';

const BlogIndexPage = () => {
  const { t } = useI18n();
  usePageMeta({ title: t('blog.title'), description: t('blog.desc'), path: '/blog' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <section className="mx-auto max-w-5xl px-6 py-8 sm:py-12">
          <div className="max-w-3xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              {t('blog.tag')}
            </p>
            <h1 className="text-4xl leading-tight text-foreground sm:text-5xl font-bold">
              {t('blog.title')}
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              {t('blog.desc')}
            </p>
          </div>

          <div className="mt-12 grid gap-6">
            {blogPosts.length > 0 ? (
              blogPosts.map((post) => (
                <article
                  key={post.slug}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {post.frontmatter.date ? <span>{post.frontmatter.date}</span> : null}
                    {post.frontmatter.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-3 py-1 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-foreground">
                    <Link className="hover:text-primary" to={getBlogRoute(post.slug)}>
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">
                    {post.description}
                  </p>
                  <Link
                    to={getBlogRoute(post.slug)}
                    className="mt-5 inline-flex text-sm font-semibold text-primary underline underline-offset-4"
                  >
                    {t('blog.read')}
                  </Link>
                </article>
              ))
            ) : (
              <section className="rounded-2xl border border-dashed border-border bg-card/50 p-8">
                <h2 className="text-2xl font-semibold text-foreground">{t('blog.empty')}</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  {t('blog.empty_desc')}
                </p>
              </section>
            )}
          </div>
        </section>
      </main>
      <FooterSection />
    </div>
  );
};

export default BlogIndexPage;
