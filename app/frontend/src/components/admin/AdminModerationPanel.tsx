import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, Pin, Eye, EyeOff, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type SocialRow = {
  id: string;
  body: string;
  author_id: string;
  is_hidden: boolean;
  likes_count: number;
  created_at: string;
};

type TopicRow = {
  id: string;
  title: string;
  author_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  created_at: string;
};

export default function AdminModerationPanel() {
  const [posts, setPosts] = useState<SocialRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: postData }, { data: topicData }] = await Promise.all([
      supabase
        .from("social_posts")
        .select("id, body, author_id, is_hidden, likes_count, created_at")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("forum_topics")
        .select("id, title, author_id, is_pinned, is_locked, reply_count, created_at")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    setPosts((postData as SocialRow[]) || []);
    setTopics((topicData as TopicRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePostHidden = async (post: SocialRow) => {
    setBusyId(post.id);
    const { error } = await supabase
      .from("social_posts")
      .update({ is_hidden: !post.is_hidden })
      .eq("id", post.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(post.is_hidden ? "Post restored" : "Post hidden");
      load();
    }
  };

  const toggleTopic = async (topic: TopicRow, field: "is_pinned" | "is_locked") => {
    setBusyId(`${topic.id}-${field}`);
    const { error } = await supabase
      .from("forum_topics")
      .update({ [field]: !topic[field] })
      .eq("id", topic.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Topic updated");
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Content moderation
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Hide community posts and pin/lock forum topics.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold">Community posts</h4>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No posts yet</p>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">
                      {post.body}
                    </p>
                    {post.is_hidden && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 shrink-0">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(post.created_at).toLocaleDateString()} · {post.likes_count} likes</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={busyId === post.id}
                      onClick={() => togglePostHidden(post)}
                    >
                      {busyId === post.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : post.is_hidden ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                      {post.is_hidden ? "Restore" : "Hide"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold">Forum topics</h4>
            {topics.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No topics yet</p>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.id}
                  className="rounded-xl border border-border p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{topic.title}</p>
                    {topic.is_pinned && <Badge variant="secondary">Pinned</Badge>}
                    {topic.is_locked && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30">Locked</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(topic.created_at).toLocaleDateString()} · {topic.reply_count} replies</span>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        disabled={busyId === `${topic.id}-is_pinned`}
                        onClick={() => toggleTopic(topic, "is_pinned")}
                      >
                        <Pin className="w-3 h-3" />
                        {topic.is_pinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        disabled={busyId === `${topic.id}-is_locked`}
                        onClick={() => toggleTopic(topic, "is_locked")}
                      >
                        <Lock className="w-3 h-3" />
                        {topic.is_locked ? "Unlock" : "Lock"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
