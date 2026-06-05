"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import GlobalStyles from "@mui/material/GlobalStyles";
import type { SvgIconComponent } from "@mui/icons-material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import InsightsIcon from "@mui/icons-material/InsightsOutlined";
import FolderIcon from "@mui/icons-material/FolderOutlined";
import TaskIcon from "@mui/icons-material/TaskAltOutlined";
import CalendarIcon from "@mui/icons-material/CalendarMonthOutlined";
import TimerIcon from "@mui/icons-material/TimerOutlined";
import AccountTreeIcon from "@mui/icons-material/AccountTreeOutlined";
import BoltIcon from "@mui/icons-material/BoltOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import ShieldIcon from "@mui/icons-material/ShieldOutlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import MicIcon from "@mui/icons-material/MicNoneOutlined";
import CheckIcon from "@mui/icons-material/CheckCircleOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import LanguageIcon from "@mui/icons-material/Language";
import IconButton from "@mui/material/IconButton";
import { BrandMark } from "@/components/BrandMark";

// ─────────────────────────────────────────────────────────────────────────────
// Prismora marketing landing — "world-class" pass.
// Strict two-color system (primary #2563eb, secondary #111827) + neutral grays.
// Modernity comes from layout (bento), motion (scroll reveal, marquee) and a
// faint, on-brand grid/glow — not from loud gradients or glass.
// Every claim maps to a real shipped feature.
// ─────────────────────────────────────────────────────────────────────────────

const BLUE = "#2563eb";

// ── Scroll-reveal wrapper: fades + lifts content into view once. ─────────────
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(16px)",
        transition: "opacity 600ms ease, transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Box>
  );
}

// ── Bento tile: bordered surface with a subtle hover lift. ───────────────────
function Tile({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        height: "100%",
        p: { xs: 2.5, md: 3 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms ease, box-shadow 200ms ease",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: "grey.300",
          boxShadow: "0 12px 32px rgba(16,24,40,0.08)",
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function IconBadge({ icon: Icon, dark = false }: { icon: SvgIconComponent; dark?: boolean }) {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: dark ? "secondary.main" : "rgba(37, 99, 235, 0.08)",
        color: dark ? "#fff" : "primary.main",
        mb: 2,
      }}
    >
      <Icon fontSize="small" />
    </Box>
  );
}

function FeatureTile({ icon, title, body }: { icon: SvgIconComponent; title: string; body: string }) {
  return (
    <Tile>
      <IconBadge icon={icon} />
      <Typography variant="h5" sx={{ mb: 0.75 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </Tile>
  );
}

// "New / announcement" pill — links into the AI section.
function AnnouncementPill() {
  return (
    <Box
      component="a"
      href="#ai"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        pl: 0.5,
        pr: 1.5,
        py: 0.5,
        borderRadius: 999,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        textDecoration: "none",
        boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
        transition: "border-color 160ms ease, box-shadow 160ms ease",
        "&:hover": { borderColor: "grey.300", boxShadow: "0 4px 12px rgba(16,24,40,0.08)" },
        "&:hover .ap-arrow": { transform: "translateX(3px)" },
      }}
    >
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: 999, bgcolor: "rgba(37,99,235,0.10)", color: "primary.main", animation: "prismora-pulse 2.6s ease-out infinite" }}>
        <AutoAwesomeIcon sx={{ fontSize: 13 }} />
        <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: "0.02em" }}>NEW</Typography>
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ color: "text.primary" }}>
        AI voice-to-task is here
      </Typography>
      <ArrowForwardIcon className="ap-arrow" sx={{ fontSize: 15, color: "text.secondary", transition: "transform 160ms ease" }} />
    </Box>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <Box sx={{ textAlign: "center", maxWidth: 700, mx: "auto", mb: { xs: 5, md: 7 } }}>
      <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.08em" }}>
        {eyebrow}
      </Typography>
      <Typography variant="h2" sx={{ mt: 1.5, fontSize: { xs: "1.7rem", md: "2.1rem" }, letterSpacing: "-0.02em" }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

// ── Reusable bits for the hero showcase ──────────────────────────────────────
function AvatarStack({ names }: { names: string[] }) {
  const tints = ["#2563eb", "#111827", "#16a34a", "#d97706"];
  return (
    <Stack direction="row" sx={{ "& > *:not(:first-of-type)": { ml: "-8px" } }}>
      {names.map((n, i) => (
        <Box key={n} sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: tints[i % tints.length], color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
          {n.charAt(0)}
        </Box>
      ))}
    </Stack>
  );
}

function BoardCard({ title, priority, who }: { title: string; priority?: { label: string; color: string }; who: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{title}</Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        {priority ? (
          <Box sx={{ px: 0.75, py: 0.125, borderRadius: 1, fontSize: 10.5, fontWeight: 700, color: priority.color, bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
            {priority.label}
          </Box>
        ) : <Box />}
        <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: "secondary.main", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {who}
        </Box>
      </Stack>
    </Box>
  );
}

// ── Hero showcase: a floating Kanban board with overlapping accent cards.
// Pure markup, brand colors, gentle float — far more dynamic than a flat window.
function HeroShowcase() {
  const COLUMNS = [
    { name: "Todo", count: 4, dot: "#6b7280", cards: [
      { title: "Research competitors", who: "S" },
      { title: "Draft launch copy", priority: { label: "Medium", color: "#d97706" }, who: "A" },
    ]},
    { name: "In Progress", count: 3, dot: BLUE, cards: [
      { title: "Design hero & key sections", priority: { label: "High", color: "#dc2626" }, who: "M" },
      { title: "Build responsive front-end", who: "J" },
    ]},
    { name: "Done", count: 8, dot: "#16a34a", cards: [
      { title: "Set up auth & database", who: "S" },
    ]},
  ];

  return (
    <Box sx={{ position: "relative", maxWidth: 980, mx: "auto" }}>
      {/* Ambient floor glow behind the board */}
      <Box aria-hidden sx={{ position: "absolute", inset: "8% -4% -12% -4%", borderRadius: "50%", background: "radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 65%)", filter: "blur(12px)", pointerEvents: "none" }} />
      {/* Board */}
      <Box sx={{ position: "relative", borderRadius: 4, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", overflow: "hidden", boxShadow: "0 30px 80px rgba(16,24,40,0.18)" }}>
        {/* diagonal light-sweep across the glass */}
        <Box aria-hidden sx={{ position: "absolute", top: 0, left: 0, width: "40%", height: "100%", zIndex: 2, pointerEvents: "none", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)", animation: "prismora-sweep 6.5s ease-in-out infinite", animationDelay: "1.2s" }} />
        {/* board header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 2, md: 3 }, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: "rgba(37,99,235,0.08)", color: "primary.main", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderIcon sx={{ fontSize: 16 }} />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>Website redesign</Typography>
              <Typography variant="caption" color="text.secondary">Board · 15 tasks</Typography>
            </Box>
          </Stack>
          <AvatarStack names={["Sara", "Mira", "Jon", "Alex"]} />
        </Stack>

        {/* columns */}
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "grey.50" }}>
          <Grid container spacing={2}>
            {COLUMNS.map((col) => (
              <Grid size={4} key={col.name}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: col.dot }} />
                  <Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{col.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{col.count}</Typography>
                </Stack>
                <Stack spacing={1.25}>
                  {col.cards.map((c) => <BoardCard key={c.title} {...c} />)}
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* Floating accent card — AI (top-left) */}
      <Box sx={{ position: "absolute", top: -26, left: -28, display: { xs: "none", md: "block" }, animation: "prismora-float 6s ease-in-out infinite" }}>
        <Box sx={{ p: 1.75, borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: "0 12px 32px rgba(16,24,40,0.12)", width: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AutoAwesomeIcon sx={{ fontSize: 16, color: "primary.main" }} />
            <Typography variant="caption" fontWeight={700}>AI suggested 3 subtasks</Typography>
          </Stack>
          <Stack spacing={0.75}>
            {["Define site structure", "Design key sections", "QA & launch"].map((s) => (
              <Stack key={s} direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid", borderColor: "grey.300" }} />
                <Typography variant="caption">{s}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Floating accent card — completion ring (bottom-right) */}
      <Box sx={{ position: "absolute", bottom: -30, right: -26, display: { xs: "none", md: "block" }, animation: "prismora-float 7s ease-in-out infinite", animationDelay: "0.8s" }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.75, borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: "0 12px 32px rgba(16,24,40,0.12)" }}>
          <Box component="svg" viewBox="0 0 36 36" sx={{ width: 44, height: 44 }}>
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke={BLUE} strokeWidth="3.5" strokeDasharray="82 100" strokeLinecap="round" transform="rotate(-90 18 18)" />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>Completion</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>82%</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Floating accent — completed toast (right, mid) */}
      <Box sx={{ position: "absolute", top: 64, right: -34, display: { xs: "none", lg: "block" }, animation: "prismora-float 5.5s ease-in-out infinite", animationDelay: "0.3s" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: "0 12px 32px rgba(16,24,40,0.12)" }}>
          <CheckIcon sx={{ fontSize: 18, color: "success.main" }} />
          <Typography variant="caption" fontWeight={700}>Task completed</Typography>
        </Stack>
      </Box>
    </Box>
  );
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "AI", href: "#ai" },
  { label: "Collaboration", href: "#collaborate" },
  { label: "Security", href: "#security" },
];

// Multi-column SaaS footer. Internal routes use Next links; "#" anchors scroll.
const FOOTER_COLS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "AI assistant", href: "#ai" },
      { label: "Collaboration", href: "#collaborate" },
      { label: "Security", href: "#security" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Status", href: "#" },
      { label: "Support", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Cookies", href: "#" },
      { label: "DPA", href: "#" },
    ],
  },
];

function FooterLink({ label, href }: { label: string; href: string }) {
  const internal = href.startsWith("/");
  return (
    <Typography
      component={internal ? Link : "a"}
      href={href}
      variant="body2"
      sx={{
        color: "text.secondary",
        textDecoration: "none",
        width: "fit-content",
        transition: "color 150ms ease",
        "&:hover": { color: "text.primary" },
      }}
    >
      {label}
    </Typography>
  );
}

const MARQUEE = [
  "AI task breakdown", "Voice to task", "Projects", "Tasks", "Analytics", "Calendar",
  "Time tracking", "Dependencies", "Templates", "Comments", "File attachments", "Labels",
  "Real-time sync", "Global search", "Notifications", "Activity log", "Audit log",
  "Role-based access", "Workspaces", "AI assistant",
];

const COLLAB_FEATURES: { icon: SvgIconComponent; title: string; body: string }[] = [
  { icon: GroupsIcon, title: "Workspaces & teams", body: "Isolated multi-tenant workspaces keep every team's projects, people and data separate." },
  { icon: BoltIcon, title: "Real-time sync", body: "Changes appear instantly for everyone. No refresh, no stale boards." },
  { icon: SearchIcon, title: "Global search", body: "Jump to any project, task or person from anywhere with ⌘K / Ctrl K." },
  { icon: MicIcon, title: "Voice to task", body: "Speak a task out loud and let AI turn it into a structured, assignable item." },
  { icon: TimerIcon, title: "Time tracking", body: "Start a timer on any task and compare estimated vs. actual effort." },
  { icon: CalendarIcon, title: "Calendar & deadlines", body: "See due dates, overdue work and what's coming up — built for teams that ship on time." },
];

const SECURITY_POINTS = [
  "Role-based access: owner, admin, manager, member and read-only viewer",
  "Row-level security on every table — data is workspace-isolated by design",
  "Full audit log of security-relevant actions for compliance",
  "Activity feed so the whole team sees what changed and when",
];

const STATS = [
  { value: "15+", label: "Built-in modules" },
  { value: "5", label: "Permission roles" },
  { value: "AI", label: "Native, not bolted on" },
  { value: "Real-time", label: "Live everywhere" },
];

// Scroll-aware floating pill navbar: transparent at the top, detaches into a
// blurred, shadowed pill once the page scrolls. Links get an animated underline.
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Box component="header" sx={{ position: "sticky", top: 0, zIndex: 30, px: { xs: 1.5, md: 2 }, pt: scrolled ? 1 : { xs: 1.5, md: 2 }, transition: "padding 240ms ease" }}>
      <Container maxWidth="lg" disableGutters>
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            height: 56,
            px: { xs: 1.5, md: 2 },
            borderRadius: 999,
            border: "1px solid",
            borderColor: scrolled ? "divider" : "transparent",
            bgcolor: scrolled ? "rgba(255,255,255,0.75)" : "transparent",
            backdropFilter: scrolled ? "saturate(180%) blur(12px)" : "none",
            boxShadow: scrolled ? "0 8px 30px rgba(16,24,40,0.08)" : "none",
            transition: "background-color 240ms ease, border-color 240ms ease, box-shadow 240ms ease",
          }}
        >
          <BrandMark />
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={0.25} sx={{ display: { xs: "none", md: "flex" } }}>
            {NAV_LINKS.map((l) => (
              <Box
                key={l.href}
                component="a"
                href={l.href}
                sx={{
                  position: "relative",
                  px: 1.5,
                  py: 0.75,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "text.secondary",
                  textDecoration: "none",
                  transition: "color 160ms ease",
                  "&:hover": { color: "text.primary" },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 5,
                    height: 2,
                    borderRadius: 2,
                    bgcolor: "primary.main",
                    transform: "scaleX(0)",
                    transition: "transform 200ms cubic-bezier(0.16,1,0.3,1)",
                  },
                  "&:hover::after": { transform: "scaleX(1)" },
                }}
              >
                {l.label}
              </Box>
            ))}
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button component={Link} href="/login" color="inherit" sx={{ color: "text.secondary", display: { xs: "none", sm: "inline-flex" } }}>
              Sign in
            </Button>
            <Button component={Link} href="/signup" variant="contained" sx={{ borderRadius: 999 }}>
              Get started
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

// Interactive spotlight that follows the cursor across the hero — a subtle,
// on-brand glow. Pointer-events disabled so it never blocks clicks.
function HeroGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Box
      ref={ref}
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: "radial-gradient(480px circle at var(--mx, 50%) var(--my, 28%), rgba(37,99,235,0.10), transparent 65%)",
      }}
    />
  );
}

export function LandingPage() {
  return (
    <Box sx={{ bgcolor: "background.paper", overflowX: "clip" }}>
      <GlobalStyles
        styles={{
          html: { scrollBehavior: "smooth" },
          "@keyframes prismora-marquee": {
            from: { transform: "translateX(0)" },
            to: { transform: "translateX(-50%)" },
          },
          "@keyframes prismora-float": {
            "0%, 100%": { transform: "translateY(0)" },
            "50%": { transform: "translateY(-10px)" },
          },
          "@keyframes prismora-grid": {
            from: { backgroundPosition: "0 0" },
            to: { backgroundPosition: "56px 56px" },
          },
          "@keyframes prismora-pulse": {
            "0%": { boxShadow: "0 0 0 0 rgba(37,99,235,0.45)" },
            "70%": { boxShadow: "0 0 0 6px rgba(37,99,235,0)" },
            "100%": { boxShadow: "0 0 0 0 rgba(37,99,235,0)" },
          },
          // Slow-drifting aurora blobs behind the hero — depth without loud color.
          "@keyframes prismora-aurora": {
            "0%": { transform: "translate(0, 0) scale(1)" },
            "33%": { transform: "translate(6%, -4%) scale(1.12)" },
            "66%": { transform: "translate(-5%, 5%) scale(0.94)" },
            "100%": { transform: "translate(0, 0) scale(1)" },
          },
          // Animated sheen sweeping across the gradient headline keyword.
          "@keyframes prismora-shimmer": {
            "0%": { backgroundPosition: "0% 50%" },
            "100%": { backgroundPosition: "200% 50%" },
          },
          // Diagonal light-sweep across the hero showcase glass.
          "@keyframes prismora-sweep": {
            "0%": { transform: "translateX(-120%) skewX(-12deg)" },
            "100%": { transform: "translateX(320%) skewX(-12deg)" },
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*": { animation: "none !important", transition: "none !important" },
          },
        }}
      />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Box sx={{ position: "relative", overflow: "hidden", mt: { xs: -7, md: -9 }, pt: { xs: 7, md: 9 } }}>
        {/* drifting aurora blobs — layered depth, on-brand blue tints */}
        <Box aria-hidden sx={{ position: "absolute", top: -220, left: "50%", transform: "translateX(-50%)", width: 900, height: 620, pointerEvents: "none", filter: "blur(8px)" }}>
          <Box sx={{ position: "absolute", top: 40, left: "8%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0) 60%)", animation: "prismora-aurora 18s ease-in-out infinite" }} />
          <Box sx={{ position: "absolute", top: 0, right: "6%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0) 60%)", animation: "prismora-aurora 22s ease-in-out infinite reverse", animationDelay: "1.5s" }} />
          <Box sx={{ position: "absolute", top: 120, left: "38%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.16) 0%, rgba(14,165,233,0) 62%)", animation: "prismora-aurora 26s ease-in-out infinite", animationDelay: "0.8s" }} />
        </Box>
        {/* faint fading grid (slow drift) */}
        <Box aria-hidden sx={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)", opacity: 0.55, animation: "prismora-grid 24s linear infinite" }} />
        {/* cursor-following spotlight */}
        <HeroGlow />

        <Container maxWidth="lg" sx={{ position: "relative", pt: { xs: 8, md: 13 }, pb: { xs: 6, md: 10 } }}>
          <Box sx={{ textAlign: "center", maxWidth: 820, mx: "auto" }}>
            <Reveal>
              <AnnouncementPill />
            </Reveal>
            <Reveal delay={60}>
              <Typography variant="h1" sx={{ mt: 3, fontSize: { xs: "2.5rem", sm: "3.1rem", md: "4.1rem" }, lineHeight: 1.04, letterSpacing: "-0.04em" }}>
                Plan, track and ship work —{" "}
                <Box component="span" sx={{ display: "inline-block" }}>
                  with{" "}
                  <Box
                    component="span"
                    sx={{
                      backgroundImage:
                        "linear-gradient(100deg, #2563eb 0%, #6366f1 35%, #0ea5e9 55%, #2563eb 100%)",
                      backgroundSize: "200% auto",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      animation: "prismora-shimmer 5s linear infinite",
                    }}
                  >
                    AI
                  </Box>{" "}
                  built in.
                </Box>
              </Typography>
            </Reveal>
            <Reveal delay={120}>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 3, fontSize: { md: "1.175rem" }, maxWidth: 640, mx: "auto" }}>
                Prismora is the project management workspace for modern teams. Projects, tasks,
                analytics, time tracking and real-time collaboration — with AI that handles the busywork.
              </Typography>
            </Reveal>
            <Reveal delay={180}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" sx={{ mt: 4 }}>
                <Button
                  component={Link}
                  href="/signup"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    borderRadius: 999,
                    px: 3.5,
                    boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
                    transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms ease",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 14px 36px rgba(37,99,235,0.45)" },
                    "& .MuiButton-endIcon": { transition: "transform 200ms ease" },
                    "&:hover .MuiButton-endIcon": { transform: "translateX(4px)" },
                  }}
                >
                  Get started free
                </Button>
                <Button
                  component={Link}
                  href="/login"
                  variant="outlined"
                  size="large"
                  sx={{
                    borderRadius: 999,
                    px: 3.5,
                    bgcolor: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(8px)",
                    transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms ease",
                    "&:hover": { transform: "translateY(-2px)", borderColor: "grey.400" },
                  }}
                >
                  Sign in
                </Button>
              </Stack>

              {/* Social proof — avatar stack + rating */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" justifyContent="center" sx={{ mt: 3.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <AvatarStack names={["Sara", "Mira", "Jon", "Alex"]} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Loved by fast-moving teams
                  </Typography>
                </Stack>
                <Box sx={{ width: "1px", height: 16, bgcolor: "divider", display: { xs: "none", sm: "block" } }} />
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{ color: "#f59e0b", fontSize: 14, letterSpacing: "1px" }}>★★★★★</Box>
                  <Typography variant="caption" color="text.secondary">
                    No credit card required
                  </Typography>
                </Stack>
              </Stack>
            </Reveal>
          </Box>

          <Reveal delay={320}>
            <Box sx={{ mt: { xs: 6, md: 11 }, mb: { md: 4 } }}>
              <HeroShowcase />
            </Box>
          </Reveal>
        </Container>
      </Box>

      {/* ── Marquee strip ────────────────────────────────────────────────── */}
      <Box sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", bgcolor: "grey.50", py: 2.5, position: "relative", maskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)" }}>
        <Box sx={{ display: "flex", width: "max-content", animation: "prismora-marquee 38s linear infinite" }}>
          {[0, 1].map((dup) => (
            <Stack key={dup} direction="row" spacing={4} sx={{ pr: 4 }} aria-hidden={dup === 1}>
              {MARQUEE.map((m) => (
                <Stack key={m} direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "primary.main", opacity: 0.6 }} />
                  <Typography variant="body2" fontWeight={600}>{m}</Typography>
                </Stack>
              ))}
            </Stack>
          ))}
        </Box>
      </Box>

      {/* ── Stat strip ───────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Grid container spacing={2}>
          {STATS.map((s, i) => (
            <Grid size={{ xs: 6, md: 3 }} key={s.label} sx={{ textAlign: "center" }}>
              <Reveal delay={i * 60}>
                <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 700, letterSpacing: "-0.02em", color: "secondary.main" }}>{s.value}</Typography>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
              </Reveal>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Bento features ───────────────────────────────────────────────── */}
      <Container id="features" maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 80 }}>
        <Reveal>
          <SectionHeading eyebrow="Everything in one workspace" title="The tools your team needs, without the clutter" subtitle="Each module is purpose-built and minimal — so your team spends time on the work, not the tool." />
        </Reveal>

        <Grid container spacing={2.5}>
          {/* large AI tile */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Reveal>
              <Tile sx={{ display: "flex", flexDirection: "column" }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <IconBadge icon={AutoAwesomeIcon} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4">AI task breakdown</Typography>
                    <Typography variant="body2" color="text.secondary">Describe the work — get subtasks, priority & estimates.</Typography>
                  </Box>
                </Stack>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "grey.50", border: "1px solid", borderColor: "divider", mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">“Launch the new marketing site by end of quarter”</Typography>
                </Box>
                <Stack spacing={1}>
                  {[
                    { s: "Define site structure & pages", chip: <Chip size="small" color="primary" label="In Progress" /> },
                    { s: "Design hero and key sections", chip: <Chip size="small" color="error" variant="outlined" label="High" /> },
                    { s: "Build responsive front-end", chip: null },
                    { s: "Review, QA and launch", chip: null },
                  ].map(({ s, chip }) => (
                    <Stack key={s} direction="row" spacing={1.25} alignItems="center" sx={{ p: 1, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
                      <Box sx={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: "grey.300", flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>{s}</Typography>
                      {chip}
                    </Stack>
                  ))}
                </Stack>
              </Tile>
            </Reveal>
          </Grid>

          {/* analytics tile with mini bars */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Reveal delay={80}>
              <Tile sx={{ display: "flex", flexDirection: "column" }}>
                <IconBadge icon={InsightsIcon} />
                <Typography variant="h4" sx={{ mb: 0.5 }}>Analytics that matter</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Completion rate, project progress and per-member activity — updated live.</Typography>
                <Stack spacing={1.75} sx={{ mt: "auto" }}>
                  {[
                    { n: "Website redesign", p: 82 },
                    { n: "Mobile app", p: 56 },
                    { n: "Q3 marketing", p: 34 },
                  ].map((row) => (
                    <Box key={row.n}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>{row.n}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.p}%</Typography>
                      </Stack>
                      <Box sx={{ height: 6, borderRadius: 999, bgcolor: "grey.200", overflow: "hidden" }}>
                        <Box sx={{ width: `${row.p}%`, height: "100%", borderRadius: 999, bgcolor: "primary.main" }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Tile>
            </Reveal>
          </Grid>

          {/* three even tiles */}
          {[
            { icon: TaskIcon, title: "Projects & tasks", body: "Statuses, priorities, assignees, due dates and estimates — filter and search across the workspace." },
            { icon: AccountTreeIcon, title: "Dependencies", body: "Mark a task blocked by another; Prismora stops it from closing until its blockers are done." },
            { icon: FolderIcon, title: "Templates", body: "Spin up new projects from SaaS, e-commerce, marketing or your own custom templates." },
          ].map((f, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
              <Reveal delay={i * 70}>
                <FeatureTile {...f} />
              </Reveal>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── AI highlight ─────────────────────────────────────────────────── */}
      <Box id="ai" sx={{ bgcolor: "grey.50", borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", scrollMarginTop: 64 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Reveal>
                <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.08em" }}>AI, natively integrated</Typography>
                <Typography variant="h2" sx={{ mt: 1.5, fontSize: { xs: "1.7rem", md: "2.1rem" }, letterSpacing: "-0.02em" }}>Let AI handle the planning busywork</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  Write a sentence or speak it out loud. Prismora's AI breaks the work into subtasks,
                  picks a sensible priority and estimates effort — then you assign and ship.
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 3 }}>
                  {["AI task breakdown into structured subtasks", "Automatic priority and time estimates", "Voice-to-task — speak it, Prismora structures it", "A dedicated AI assistant for your workspace"].map((t) => (
                    <Stack key={t} direction="row" spacing={1.25} alignItems="flex-start">
                      <CheckIcon sx={{ fontSize: 20, color: "primary.main", mt: "1px" }} />
                      <Typography variant="body2">{t}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Reveal>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Reveal delay={100}>
                <Tile>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 18, color: "primary.main" }} />
                    <Typography variant="h6">AI assistant</Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    <Box sx={{ alignSelf: "flex-end", maxWidth: "85%", px: 1.75, py: 1.25, borderRadius: "14px 14px 4px 14px", bgcolor: "primary.main", color: "#fff" }}>
                      <Typography variant="body2">What's overdue across my projects this week?</Typography>
                    </Box>
                    <Box sx={{ alignSelf: "flex-start", maxWidth: "90%", px: 1.75, py: 1.25, borderRadius: "14px 14px 14px 4px", bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>3 tasks are overdue. Highest priority:</Typography>
                      <Stack spacing={0.75}>
                        {["Integrate billing webhook · High", "Finalize onboarding copy · Medium", "Ship analytics export · Medium"].map((x) => (
                          <Stack key={x} direction="row" spacing={1} alignItems="center">
                            <BoltIcon sx={{ fontSize: 14, color: "primary.main" }} />
                            <Typography variant="caption">{x}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Tile>
              </Reveal>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Collaboration features ───────────────────────────────────────── */}
      <Container id="collaborate" maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 64 }}>
        <Reveal>
          <SectionHeading eyebrow="Built for teams" title="Collaborate in real time, stay in flow" subtitle="From comments to ⌘K search, every detail is tuned to keep your team moving." />
        </Reveal>
        <Grid container spacing={2.5}>
          {COLLAB_FEATURES.map((f, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
              <Reveal delay={(i % 3) * 70}>
                <FeatureTile {...f} />
              </Reveal>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Security / RBAC ──────────────────────────────────────────────── */}
      <Box id="security" sx={{ bgcolor: "grey.50", borderTop: "1px solid", borderColor: "divider", scrollMarginTop: 64 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Reveal>
                <IconBadge icon={ShieldIcon} dark />
                <Typography variant="h2" sx={{ fontSize: { xs: "1.7rem", md: "2.1rem" }, letterSpacing: "-0.02em" }}>Enterprise-grade by default</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  Granular roles and row-level security keep every workspace isolated and every
                  action accountable — without slowing your team down.
                </Typography>
              </Reveal>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                {SECURITY_POINTS.map((p, i) => (
                  <Reveal key={p} delay={i * 70}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                      <ShieldIcon sx={{ fontSize: 20, color: "primary.main", mt: "1px" }} />
                      <Typography variant="body2">{p}</Typography>
                    </Stack>
                  </Reveal>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Box sx={{ position: "relative", overflow: "hidden", borderRadius: 4, bgcolor: "secondary.main", color: "#fff", px: { xs: 4, md: 8 }, py: { xs: 6, md: 10 }, textAlign: "center" }}>
            <Box aria-hidden sx={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 620, height: 360, background: "radial-gradient(circle, rgba(37,99,235,0.45) 0%, rgba(37,99,235,0) 60%)", pointerEvents: "none" }} />
            <Box sx={{ position: "relative" }}>
              <Typography variant="h2" sx={{ color: "#fff", fontSize: { xs: "1.85rem", md: "2.4rem" }, letterSpacing: "-0.02em" }}>Ready to run your projects the modern way?</Typography>
              <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.72)", mt: 2, maxWidth: 540, mx: "auto" }}>
                Create your workspace in seconds and bring your whole team into one clean, fast, AI-powered home for work.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" sx={{ mt: 4 }}>
                <Button component={Link} href="/signup" variant="contained" size="large" endIcon={<ArrowForwardIcon />}>Get started free</Button>
                <Button component={Link} href="/login" size="large" variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" } }}>Sign in</Button>
              </Stack>
            </Box>
          </Box>
        </Reveal>
      </Container>

      {/* ── Footer (SaaS grid) ───────────────────────────────────────────── */}
      <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 8 }, pb: 5 }}>
          <Grid container spacing={{ xs: 4, md: 5 }}>
            {/* brand column */}
            <Grid size={{ xs: 12, md: 4 }}>
              <BrandMark />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 300 }}>
                The AI-powered project management workspace for modern teams. Plan, track and ship — all in one place.
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 2.5, ml: -1 }}>
                {[
                  { icon: GitHubIcon, label: "GitHub" },
                  { icon: LinkedInIcon, label: "LinkedIn" },
                  { icon: LanguageIcon, label: "Website" },
                ].map(({ icon: Icon, label }) => (
                  <IconButton key={label} component="a" href="#" aria-label={label} size="small" sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                    <Icon fontSize="small" />
                  </IconButton>
                ))}
              </Stack>
              <Button component={Link} href="/signup" variant="contained" size="small" endIcon={<ArrowForwardIcon />} sx={{ mt: 3 }}>
                Get started free
              </Button>
            </Grid>

            {/* link columns */}
            {FOOTER_COLS.map((col) => (
              <Grid size={{ xs: 6, sm: 3, md: 2 }} key={col.heading}>
                <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                  {col.heading}
                </Typography>
                <Stack spacing={1.25}>
                  {col.links.map((l) => (
                    <FooterLink key={l.label} {...l} />
                  ))}
                </Stack>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: { xs: 4, md: 5 } }} />

          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" spacing={1.5}>
            <Typography variant="caption" color="text.secondary">
              © {new Date().getFullYear()} Prismora. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={2.5} alignItems="center">
              <FooterLink label="Privacy" href="#" />
              <FooterLink label="Terms" href="#" />
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "success.main" }} />
                <Typography variant="caption" color="text.secondary">All systems operational</Typography>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
