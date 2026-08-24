import { createClient, type Session } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from "react";
import { createPortal } from "react-dom";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? "https://ndsyavqxrzuxeosdbkye.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    "sb_publishable_izbb9TVLvrrQCPB5iQM9fA_Tolw2tzB"
);

type CommentStatus = "pending" | "approved" | "declined";

type PageComment = {
  id: string;
  parent_id: string | null;
  page_path: string;
  section_id: string | null;
  selected_text: string;
  text_before: string;
  text_after: string;
  comment_text: string;
  author_id: string;
  author_name: string;
  status: CommentStatus;
  created_at: string;
};

type SelectionDraft = {
  selectedText: string;
  textBefore: string;
  textAfter: string;
  sectionId: string | null;
  top: number;
  left: number;
};

type CommentMarker = {
  commentId: string;
  authorName: string;
  top: number;
  left: number;
};

type HighlightRegistry = {
  set: (name: string, highlight: unknown) => void;
  delete: (name: string) => void;
};

type HighlightConstructor = new (...ranges: Range[]) => unknown;

function AnnotationPortal({
  host,
  children
}: {
  host: Element | null;
  children: React.ReactNode;
}) {
  return host ? createPortal(children, host) : children;
}

const savedNameKey = "ceps-speedometer-comment-name";

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function highlightRegistry() {
  return (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
}

function createHighlight(ranges: Range[]) {
  const HighlightClass = (window as unknown as { Highlight?: HighlightConstructor }).Highlight;
  return HighlightClass ? new HighlightClass(...ranges) : null;
}

function matchingContextScore(source: string, index: number, comment: PageComment) {
  const before = comment.text_before.slice(-180);
  const after = comment.text_after.slice(0, 180);
  let score = 0;

  for (let offset = 1; offset <= before.length && offset <= index; offset += 1) {
    if (source[index - offset] !== before[before.length - offset]) break;
    score += 1;
  }

  const afterIndex = index + comment.selected_text.length;
  for (let offset = 0; offset < after.length && afterIndex + offset < source.length; offset += 1) {
    if (source[afterIndex + offset] !== after[offset]) break;
    score += 1;
  }

  return score;
}

function findCommentRange(comment: PageComment) {
  const main = document.querySelector("main");
  if (!main) return null;

  const savedContainer = comment.section_id
    ? document.querySelector<HTMLElement>(
        `[data-annotation-container="${CSS.escape(comment.section_id)}"]`
      ) ?? document.getElementById(comment.section_id)
    : null;
  const containers = savedContainer && main.contains(savedContainer) ? [savedContainer, main] : [main];

  for (const container of containers) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("[data-annotation-ui], script, style, input, textarea, button")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const positions: Array<{ node: Text; offset: number }> = [];
    let normalized = "";
    let node = walker.nextNode();

    while (node) {
      const textNode = node as Text;
      for (let offset = 0; offset < textNode.data.length; offset += 1) {
        const character = textNode.data[offset];
        if (/\s/.test(character)) {
          if (normalized && normalized.at(-1) !== " ") {
            normalized += " ";
            positions.push({ node: textNode, offset });
          }
        } else {
          normalized += character;
          positions.push({ node: textNode, offset });
        }
      }
      node = walker.nextNode();
    }

    if (normalized.endsWith(" ")) {
      normalized = normalized.slice(0, -1);
      positions.pop();
    }

    const candidates: number[] = [];
    let searchFrom = 0;
    while (searchFrom <= normalized.length - comment.selected_text.length) {
      const match = normalized.indexOf(comment.selected_text, searchFrom);
      if (match < 0) break;
      candidates.push(match);
      searchFrom = match + 1;
    }

    const index = candidates.sort(
      (a, b) => matchingContextScore(normalized, b, comment) - matchingContextScore(normalized, a, comment)
    )[0];
    if (index === undefined) continue;

    const start = positions[index];
    const end = positions[index + comment.selected_text.length - 1];
    if (!start || !end) continue;

    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset + 1);
    return range;
  }

  return null;
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function visibleCommentRange(comment: PageComment, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const range = findCommentRange(comment);
    const details = range?.startContainer.parentElement?.closest("details");
    if (details && !details.open) details.open = true;

    if (range && Array.from(range.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0)) {
      return range;
    }
    await nextPaint();
  }
  return null;
}

function scrollableAncestor(element: Element | null) {
  let current = element?.parentElement ?? null;
  while (current && current !== document.body && current !== document.documentElement) {
    const overflowY = window.getComputedStyle(current).overflowY;
    if (/(auto|scroll)/.test(overflowY) && current.scrollHeight > current.clientHeight + 1) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

type AnnotationsProps = {
  trackId?: "automotive" | "healthcare" | "platform";
  pageId?: string;
  title?: string;
};

export default function Annotations({
  trackId,
  pageId = "speedometer-main",
  title = "Comment on the evidence"
}: AnnotationsProps = {}) {
  const savedSelectionKey = `ceps-task-force-selection:${pageId}`;
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "register">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selection, setSelection] = useState<SelectionDraft | null>(null);
  const [comments, setComments] = useState<PageComment[]>([]);
  const [accessReady, setAccessReady] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [filter, setFilter] = useState<"all" | CommentStatus>("all");
  const [authorName, setAuthorName] = useState(() => localStorage.getItem(savedNameKey) ?? "");
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [commentMarkers, setCommentMarkers] = useState<CommentMarker[]>([]);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [annotationHost, setAnnotationHost] = useState<HTMLDialogElement | null>(null);
  const markerFrame = useRef<number | null>(null);
  const commentHitAreas = useRef<Array<{ commentId: string; rects: DOMRect[] }>>([]);
  const annotationDialogRef = useRef<HTMLDialogElement>(null);

  const loadComments = useCallback(async () => {
    if (!session) {
      setComments([]);
      return;
    }

    const { data, error } = await supabase
      .from("comments")
      .select(
        "id,parent_id,page_path,section_id,selected_text,text_before,text_after,comment_text,author_id,author_name,status,created_at"
      )
      .eq("page_path", pageId)
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("Comments could not be loaded. Please try again.");
      return;
    }

    setComments((data ?? []) as PageComment[]);
  }, [pageId, session]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthReady(true);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(savedSelectionKey);
    if (!saved) return;

    try {
      const restored = JSON.parse(saved) as SelectionDraft;
      setSelection({ ...restored, top: 0, left: 0 });
      setPanelOpen(true);
    } catch {
      sessionStorage.removeItem(savedSelectionKey);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setAccessReady(false);
      setIsAllowed(false);
      setIsModerator(false);
      return;
    }

    let active = true;
    setAccessReady(false);

    Promise.all([
      trackId
        ? supabase.rpc("can_access_track", { requested_track: trackId })
        : supabase.rpc("is_allowed_user"),
      trackId
        ? supabase.rpc("is_track_moderator", { requested_track: trackId })
        : supabase.rpc("is_moderator")
    ]).then(async ([allowedResult, moderatorResult]) => {
      if (!active) return;

      const allowed = !allowedResult.error && Boolean(allowedResult.data);
      setIsAllowed(allowed);
      setIsModerator(allowed && !moderatorResult.error && Boolean(moderatorResult.data));
      setAccessReady(true);

      if (!allowed) {
        setAuthMessage("This email is not on the participant list.");
        await supabase.auth.signOut();
        return;
      }

      await loadComments();
    });

    return () => {
      active = false;
    };
  }, [loadComments, session, trackId]);

  useEffect(() => {
    if (!panelOpen) return undefined;

    const dialog = annotationDialogRef.current;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [panelOpen]);

  useEffect(() => {
    const registry = highlightRegistry();
    const highlightedComments = session
      ? comments.filter((comment) => !comment.parent_id && comment.status !== "declined")
      : [];

    const updateHighlights = () => {
      if (markerFrame.current !== null) window.cancelAnimationFrame(markerFrame.current);
      markerFrame.current = window.requestAnimationFrame(() => {
        const ranges: Range[] = [];
        const markers: CommentMarker[] = [];
        const hitAreas: Array<{ commentId: string; rects: DOMRect[] }> = [];

        highlightedComments.forEach((comment) => {
          const range = findCommentRange(comment);
          if (!range) return;
          ranges.push(range);

          const rects = Array.from(range.getClientRects());
          const rect = rects.at(-1);
          if (!rect || rect.width === 0 || rect.height === 0) return;
          hitAreas.push({
            commentId: comment.id,
            rects: rects.map((item) => new DOMRect(
              window.scrollX + item.left,
              window.scrollY + item.top,
              item.width,
              item.height
            ))
          });
          markers.push({
            commentId: comment.id,
            authorName: comment.author_name,
            top: window.scrollY + rect.top + rect.height / 2,
            left: Math.min(document.documentElement.clientWidth - 18, rect.right + 7)
          });
        });

        const highlight = createHighlight(ranges);
        if (registry && highlight) registry.set("comment-annotations", highlight);
        commentHitAreas.current = hitAreas;
        setCommentMarkers(markers);
        markerFrame.current = null;
      });
    };

    updateHighlights();
    window.addEventListener("resize", updateHighlights);
    document.addEventListener("scroll", updateHighlights, true);
    const revealMarker = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".annotation-comment-marker")) return;

      const match = commentHitAreas.current.find(({ rects }) => rects.some((rect) => (
        event.pageX >= rect.left - 2
        && event.pageX <= rect.right + 2
        && event.pageY >= rect.top - 2
        && event.pageY <= rect.bottom + 2
      )));
      setHoveredCommentId((current) => current === match?.commentId ? current : match?.commentId ?? null);
    };
    document.addEventListener("pointermove", revealMarker);
    const main = document.querySelector("main");
    const resizeObserver = main ? new ResizeObserver(updateHighlights) : null;
    if (main && resizeObserver) resizeObserver.observe(main);

    return () => {
      window.removeEventListener("resize", updateHighlights);
      document.removeEventListener("scroll", updateHighlights, true);
      document.removeEventListener("pointermove", revealMarker);
      resizeObserver?.disconnect();
      if (markerFrame.current !== null) window.cancelAnimationFrame(markerFrame.current);
      registry?.delete("comment-annotations");
      commentHitAreas.current = [];
      setCommentMarkers([]);
    };
  }, [comments, session]);

  useEffect(() => {
    const clearSelection = () => {
      setSelection(null);
      if (!panelOpen) setAnnotationHost(null);
      window.getSelection()?.removeAllRanges();
    };

    const dismissSelection = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-annotation-ui]")) return;

      clearSelection();
    };

    const captureSelection = () => {
      if (panelOpen) return;

      const browserSelection = window.getSelection();
      if (!browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
        return;
      }

      const range = browserSelection.getRangeAt(0);
      const startElement =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer.parentElement;
      const endElement =
        range.endContainer instanceof Element
          ? range.endContainer
          : range.endContainer.parentElement;
      const main = document.querySelector("main");

      if (
        !startElement ||
        !endElement ||
        !main?.contains(startElement) ||
        !main.contains(endElement) ||
        startElement.closest("[data-annotation-ui], input, textarea, button, [contenteditable]")
      ) {
        return;
      }

      const selectedText = normalizeText(browserSelection.toString());
      if (selectedText.length < 3 || selectedText.length > 1000) return;

      const annotationContainer = startElement.closest<HTMLElement>("[data-annotation-container]");
      const section = startElement.closest<HTMLElement>("section[id], article[id], details[id], [id]");
      const contextContainer = annotationContainer
        ?? section
        ?? startElement.closest<HTMLElement>("section, article")
        ?? startElement;
      const context = normalizeText(contextContainer.textContent ?? "");
      const selectedIndex = context.indexOf(selectedText);
      const rect = range.getBoundingClientRect();

      setSelection({
        selectedText,
        textBefore: selectedIndex >= 0 ? context.slice(Math.max(0, selectedIndex - 180), selectedIndex) : "",
        textAfter:
          selectedIndex >= 0
            ? context.slice(selectedIndex + selectedText.length, selectedIndex + selectedText.length + 180)
            : "",
        sectionId: annotationContainer?.dataset.annotationContainer || section?.id || null,
        top: Math.max(14, rect.top - 46),
        left: Math.min(window.innerWidth - 75, Math.max(75, rect.left + rect.width / 2))
      });
      setAnnotationHost(startElement.closest<HTMLDialogElement>("dialog.scenario-drawer"));
    };

    const handlePointerUp = () => window.setTimeout(captureSelection, 0);
    document.addEventListener("pointerdown", dismissSelection);
    document.addEventListener("mouseup", handlePointerUp);
    document.addEventListener("touchend", handlePointerUp);
    document.addEventListener("scroll", clearSelection, true);

    return () => {
      document.removeEventListener("pointerdown", dismissSelection);
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchend", handlePointerUp);
      document.removeEventListener("scroll", clearSelection, true);
    };
  }, [panelOpen]);

  const visibleComments = useMemo(
    () => {
      const replies = comments.filter((comment) => comment.parent_id);
      return comments.filter((comment) => (
        !comment.parent_id
        && (
          filter === "all"
          || comment.status === filter
          || replies.some((reply) => reply.parent_id === comment.id && reply.status === filter)
        )
      ));
    },
    [comments, filter]
  );

  const repliesByParent = useMemo(() => {
    const grouped = new Map<string, PageComment[]>();
    comments.forEach((comment) => {
      if (!comment.parent_id) return;
      const replies = grouped.get(comment.parent_id) ?? [];
      replies.push(comment);
      grouped.set(comment.parent_id, replies);
    });
    return grouped;
  }, [comments]);

  function openForSelection() {
    if (selection) sessionStorage.setItem(savedSelectionKey, JSON.stringify(selection));
    setPanelOpen(true);
    window.getSelection()?.removeAllRanges();
  }

  async function submitAuthentication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (authMode === "register" && password !== confirmPassword) {
      setAuthMessage("The passwords do not match.");
      return;
    }

    setBusy(true);
    setAuthMessage("");

    if (authMode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password
      });

      setBusy(false);
      setPassword("");
      setConfirmPassword("");
      setAuthMessage(
        error
          ? error.message
          : data.session
            ? "Your account has been created."
            : "Your account was created, but Supabase is still requiring email confirmation."
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    setBusy(false);
    setPassword("");
    setAuthMessage(error ? error.message : "Signed in.");
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selection) return;

    const cleanName = authorName.trim();
    const cleanComment = commentText.trim();
    if (!cleanName || !cleanComment) return;

    setBusy(true);
    setNotice("");
    const { error } = await supabase.from("comments").insert({
      page_path: pageId,
      ...(trackId ? { track_id: trackId } : {}),
      section_id: selection.sectionId,
      selected_text: selection.selectedText,
      text_before: selection.textBefore,
      text_after: selection.textAfter,
      comment_text: cleanComment,
      author_name: cleanName
    });
    setBusy(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    localStorage.setItem(savedNameKey, cleanName);
    sessionStorage.removeItem(savedSelectionKey);
    setCommentText("");
    setSelection(null);
    setNotice("Your comment is pending moderator review.");
    await loadComments();
  }

  async function submitReply(event: FormEvent<HTMLFormElement>, parent: PageComment) {
    event.preventDefault();
    if (!session || !replyText.trim() || !authorName.trim()) return;

    setBusy(true);
    setNotice("");
    const { error } = await supabase.from("comments").insert({
      parent_id: parent.id,
      page_path: parent.page_path,
      ...(trackId ? { track_id: trackId } : {}),
      section_id: parent.section_id,
      selected_text: parent.selected_text,
      text_before: parent.text_before,
      text_after: parent.text_after,
      comment_text: replyText.trim(),
      author_name: authorName.trim()
    });
    setBusy(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    localStorage.setItem(savedNameKey, authorName.trim());
    setReplyText("");
    setReplyingTo(null);
    setNotice("Your reply is pending moderator review.");
    await loadComments();
  }

  async function moderateComment(id: string, status: "approved" | "declined") {
    if (!session || !isModerator) return;

    setBusy(true);
    const { error } = await supabase
      .from("comments")
      .update({
        status,
        moderated_at: new Date().toISOString(),
        moderated_by: session.user.id
      })
      .eq("id", id);
    setBusy(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice(status === "approved" ? "Comment approved." : "Comment declined.");
    await loadComments();
  }

  async function showCommentTarget(comment: PageComment) {
    setPanelOpen(false);
    await nextPaint();

    let range = await visibleCommentRange(comment, 3);
    if (!range) {
      window.dispatchEvent(new CustomEvent("ceps:reveal-annotation", {
        detail: {
          containerId: comment.section_id,
          selectedText: comment.selected_text,
          textBefore: comment.text_before,
          textAfter: comment.text_after
        }
      }));
      range = await visibleCommentRange(comment);
    }

    if (range) {
      const rect = range.getBoundingClientRect();
      const rangeElement = range.startContainer.parentElement;
      const scrollContainer = scrollableAncestor(rangeElement);

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        scrollContainer.scrollTo({
          top: Math.max(
            0,
            scrollContainer.scrollTop
              + rect.top
              - containerRect.top
              - scrollContainer.clientHeight * 0.35
          ),
          behavior: "smooth"
        });
      } else {
        window.scrollTo({
          top: Math.max(0, window.scrollY + rect.top - window.innerHeight * 0.38),
          behavior: "smooth"
        });
      }

      const registry = highlightRegistry();
      const highlight = createHighlight([range]);
      if (registry && highlight) {
        registry.set("active-comment-annotation", highlight);
        window.setTimeout(() => registry.delete("active-comment-annotation"), 2400);
      }
      return;
    }

    const target = comment.section_id ? document.getElementById(comment.section_id) : null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPanelOpen(false);
    setComments([]);
  }

  const approvedCount = comments.filter((comment) => comment.status === "approved").length;

  function openCommentFromMarker(commentId: string) {
    setPanelOpen(true);
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-comment-id="${commentId}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 100);
  }

  function renderComment(comment: PageComment, isReply = false) {
    const replies = isReply ? [] : (repliesByParent.get(comment.id) ?? []).filter(
      (reply) => filter === "all" || reply.status === filter
    );

    return (
      <article
        className={isReply ? "annotation-reply" : undefined}
        data-comment-id={comment.id}
        key={comment.id}
      >
        <div className="annotation-meta">
          <strong>{comment.author_name}</strong>
          <time dateTime={comment.created_at}>{displayDate(comment.created_at)}</time>
          <span className={`comment-status ${comment.status}`}>{comment.status}</span>
        </div>
        {!isReply ? (
          <button
            className="annotation-quote"
            type="button"
            onClick={() => showCommentTarget(comment)}
          >
            “{comment.selected_text}”
          </button>
        ) : null}
        <p>{comment.comment_text}</p>
        <div className="annotation-comment-actions">
          {!isReply && comment.status === "approved" ? (
            <button
              type="button"
              onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                setReplyText("");
              }}
            >
              {replyingTo === comment.id ? "Cancel reply" : "Reply"}
            </button>
          ) : null}
          {isModerator && comment.status === "pending" ? (
            <div className="moderation-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => void moderateComment(comment.id, "approved")}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void moderateComment(comment.id, "declined")}
              >
                Decline
              </button>
            </div>
          ) : null}
        </div>
        {!isReply && replyingTo === comment.id ? (
          <form className="annotation-reply-form" onSubmit={(event) => submitReply(event, comment)}>
            <label>
              Display name
              <input
                required
                maxLength={80}
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
              />
            </label>
            <label>
              Reply
              <textarea
                required
                maxLength={4000}
                rows={3}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
              />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Submit reply for review"}
            </button>
          </form>
        ) : null}
        {replies.length ? (
          <div className="annotation-replies" aria-label={`Replies to ${comment.author_name}`}>
            {replies.map((reply) => renderComment(reply, true))}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div className="annotation-ui" data-annotation-ui>
      <AnnotationPortal host={annotationHost}>
        {selection && !panelOpen ? (
          <button
            className="selection-comment-button"
            type="button"
            style={{ top: selection.top, left: selection.left }}
            data-annotation-ui
            onClick={openForSelection}
          >
            Comment
          </button>
        ) : null}
      </AnnotationPortal>

      {session && !panelOpen ? commentMarkers.map((marker) => (
        <button
          className={`annotation-comment-marker${hoveredCommentId === marker.commentId ? " is-visible" : ""}`}
          type="button"
          style={{ top: marker.top, left: marker.left }}
          aria-label={`Comment by ${marker.authorName}`}
          title={`Comment by ${marker.authorName}`}
          onPointerEnter={() => setHoveredCommentId(marker.commentId)}
          onClick={() => openCommentFromMarker(marker.commentId)}
          key={marker.commentId}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4.5h12v8H9l-3.5 3v-3H4z" />
          </svg>
        </button>
      )) : null}

      <button
        className="annotation-launcher"
        type="button"
        onClick={() => setPanelOpen(true)}
      >
        <span>{session ? "Page comments" : "Sign in to comment"}</span>
        {session && approvedCount > 0 ? <b>{approvedCount}</b> : null}
      </button>

      {panelOpen ? (
          <dialog
            className="annotation-overlay"
            data-annotation-ui
            ref={annotationDialogRef}
            aria-labelledby="annotation-title"
            onClose={() => setPanelOpen(false)}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPanelOpen(false);
            }}
          >
          <aside
            className="annotation-panel"
          >
            <header>
              <div>
                <span>Task Force annotations</span>
                <h2 id="annotation-title">{title}</h2>
              </div>
              <button
                type="button"
                aria-label="Close comments"
                autoFocus
                onClick={() => annotationDialogRef.current?.close()}
              >
                ×
              </button>
            </header>

            {!authReady ? <p className="annotation-message" role="status">Checking your session…</p> : null}

            {authReady && !session ? (
              <section className="annotation-auth">
                <h3>{authMode === "register" ? "Create your account" : "Sign in"}</h3>
                <p>
                  Access is available to email addresses on the Task Force participant list.
                </p>
                <form onSubmit={submitAuthentication}>
                  <label>
                    Email address
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      required
                      minLength={10}
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </label>
                  {authMode === "register" ? (
                    <label>
                      Confirm password
                      <input
                        type="password"
                        required
                        minLength={10}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                      />
                    </label>
                  ) : null}
                  <button type="submit" disabled={busy}>
                    {busy
                      ? "Please wait…"
                      : authMode === "register"
                        ? "Create account"
                        : "Sign in"}
                  </button>
                </form>
                <button
                  className="annotation-auth-switch"
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "register" ? "sign-in" : "register");
                    setPassword("");
                    setConfirmPassword("");
                    setAuthMessage("");
                  }}
                >
                  {authMode === "register"
                    ? "Already have an account? Sign in"
                    : "First visit? Create an account"}
                </button>
                {authMessage ? <p className="annotation-message" role="status">{authMessage}</p> : null}
              </section>
            ) : null}

            {session && !accessReady ? (
              <p className="annotation-message" role="status">Checking participant access…</p>
            ) : null}

            {session && accessReady && isAllowed ? (
              <>
                <div className="annotation-account">
                  <span>Signed in as {session.user.email}</span>
                  {isModerator ? <b>Moderator</b> : null}
                  <button type="button" onClick={signOut}>Sign out</button>
                </div>

                {selection ? (
                  <form className="annotation-form" onSubmit={submitComment}>
                    <span>Selected text</span>
                    <blockquote>“{selection.selectedText}”</blockquote>
                    <label>
                      Display name
                      <input
                        required
                        maxLength={80}
                        value={authorName}
                        onChange={(event) => setAuthorName(event.target.value)}
                      />
                    </label>
                    <label>
                      Comment
                      <textarea
                        required
                        maxLength={4000}
                        rows={5}
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                      />
                    </label>
                    <div>
                      <button type="submit" disabled={busy}>
                        {busy ? "Submitting…" : "Submit for review"}
                      </button>
                      <button
                        className="annotation-cancel"
                        type="button"
                        onClick={() => {
                          setSelection(null);
                          sessionStorage.removeItem(savedSelectionKey);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="annotation-guidance">
                    Select a passage and choose Comment. Share relevant regional, national
                    or cross-border examples. When commenting on channel weights, explain
                    why you consider that channel critical.
                  </p>
                )}

                {notice ? <p className="annotation-message" role="status">{notice}</p> : null}

                <section className="annotation-comments">
                  <div className="annotation-comments-heading">
                    <div>
                      <span>{isModerator ? "Moderation queue" : "Discussion"}</span>
                      <h3>{comments.length} comments</h3>
                    </div>
                    <button type="button" onClick={() => void loadComments()}>Refresh</button>
                  </div>

                  {isModerator ? (
                    <div className="annotation-filters" aria-label="Filter comments">
                      {(["all", "pending", "approved", "declined"] as const).map((status) => (
                        <button
                          type="button"
                          className={filter === status ? "active" : ""}
                          onClick={() => setFilter(status)}
                          key={status}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="annotation-list">
                    {visibleComments.length ? visibleComments.map((comment) => renderComment(comment)) : (
                      <p className="annotation-empty">No comments in this view.</p>
                    )}
                  </div>
                </section>
              </>
            ) : null}
          </aside>
          </dialog>
        ) : null}
    </div>
  );
}
