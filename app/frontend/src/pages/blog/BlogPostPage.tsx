import { Navigate, useLocation } from 'react-router-dom';
import BlogArticleLayout from '@/components/blog/BlogArticleLayout';
import MarkdownArticle from '@/components/blog/MarkdownArticle';
import SeoJsonLd, { articleJsonLd, breadcrumbJsonLd } from '@/components/SeoJsonLd';
import { usePageMeta } from '@/hooks/use-page-meta';
import { getBlogPost, getBlogRoute, getPostSeoMeta } from '@/lib/blog';
import { SITE } from '@/lib/site-config';

function getSlugFromPathname(pathname: string) {
  return pathname
    .replace(/^\/blog\/?/, '')
    .replace(/\/+$/, '')
    .replace(/^\/+/, '');
}

const BlogPostPage = () => {
  const location = useLocation();
  const slug = getSlugFromPathname(location.pathname);
  const post = slug === '*' ? null : getBlogPost(slug);
  const seoMeta = getPostSeoMeta(post);
  const blogPath = post ? getBlogRoute(post.slug) : '/blog';

  usePageMeta({
    title: post?.title || seoMeta.title,
    description: seoMeta.description,
    path: blogPath,
    image: seoMeta.ogImage || SITE.ogImage,
    type: post ? "article" : "website",
  });

  if (slug === '*') {
    return <Navigate to="/blog/" replace />;
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center">
        <div className="space-y-6 max-w-md">
          <div className="space-y-4">
            <h1 className="text-7xl font-bold text-gray-300">404</h1>
            <h2 className="text-2xl font-bold text-gray-800">Page Not Found</h2>
            <p className="text-base text-muted-foreground">
              Sorry, the blog post you are looking for does not exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoJsonLd
        data={[
          articleJsonLd({
            title: post.title,
            description: post.description,
            path: blogPath,
            date: seoMeta.publishedTime,
            image: seoMeta.ogImage,
          }),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: blogPath },
          ]),
        ]}
      />
      <BlogArticleLayout title={post.title} description={post.description}>
        <MarkdownArticle markdown={post.markdown} />
      </BlogArticleLayout>
    </>
  );
};

export default BlogPostPage;
