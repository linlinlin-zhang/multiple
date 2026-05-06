import AppNavigation from "@/components/AppNavigation";
import { useI18n, type Lang } from "@/lib/i18n";
import {
  ArrowRight,
  BookOpen,
  FileUp,
  GitBranch,
  Keyboard,
  Layers,
  Menu,
  MessageSquare,
  MousePointer2,
  Search,
  Share2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

type GuideItem = {
  action: string;
  detail: string;
};

type GuideSection = {
  id: string;
  title: string;
  icon: ReactNode;
  items: GuideItem[];
};

type CommandRow = {
  command: string;
  detail: string;
};

const zhSections: GuideSection[] = [
  {
    id: "start",
    title: "开始一次会话",
    icon: <FileUp size={20} />,
    items: [
      { action: "上传文件", detail: "源卡片支持图片、视频、PDF、Word、PPT、TXT/MD/JSON。" },
      { action: "输入链接", detail: "切到“链接”后粘贴 URL，点击“分析链接”。" },
      { action: "分析 / 探索", detail: "源卡片右侧“研究”里选择分析或探索；探索会更慢，但会生成更深入的卡片。" },
      { action: "继续追问", detail: "底部聊天框会结合当前会话里的卡片、素材和上下文。" },
    ],
  },
  {
    id: "canvas",
    title: "画布移动与视图",
    icon: <MousePointer2 size={20} />,
    items: [
      { action: "拖动画布空白处", detail: "平移整张画布。" },
      { action: "滚轮", detail: "上下滚动画布；Shift + 滚轮横向移动。" },
      { action: "Ctrl / ⌘ + 滚轮", detail: "缩放画布。" },
      { action: "右上视图按钮", detail: "可放大、缩小、适配视图、自动整理。" },
      { action: "小地图", detail: "在聊天框“+”菜单里打开；点击小地图可快速跳转画布位置。" },
    ],
  },
  {
    id: "cards",
    title: "卡片选择、移动、尺寸",
    icon: <Layers size={20} />,
    items: [
      { action: "拖动卡片", detail: "移动卡片；多选后拖动任意一张会一起移动。" },
      { action: "双击卡片", detail: "选中为当前聊天上下文；如果卡片有引用，则打开引用面板。" },
      { action: "双击标题", detail: "重命名源卡片、生成卡片或蓝图里的卡片标题。" },
      { action: "拖动边缘/角点", detail: "调整卡片宽高。" },
      { action: "Shift / Ctrl / ⌘ + 点击", detail: "加入或移出多选。" },
      { action: "Shift + 拖动画布空白处", detail: "框选多张卡片；出现工具条后可分组、解除分组或整理选中区域。" },
    ],
  },
  {
    id: "links",
    title: "连线、收纳、蓝图",
    icon: <GitBranch size={20} />,
    items: [
      { action: "拖卡片左右边缘小把手", detail: "拉到另一张卡片上创建连接。" },
      { action: "双击主画布连线", detail: "弹出确认后删除这条连线。" },
      { action: "点击卡片左侧收纳点", detail: "收起/展开非生成类后续卡片。" },
      { action: "双击收纳点", detail: "收起/展开该卡片的全部后续分支。" },
      { action: "三击收纳点", detail: "展开所有已收起分支。" },
      { action: "双击聚合圆点", detail: "打开蓝图；蓝图里可拖卡片、拉关系线、选择上游/下游/并列。" },
      { action: "双击蓝图关系线", detail: "给两张卡片之间的关系添加说明。" },
    ],
  },
  {
    id: "chat",
    title: "聊天区与 / 命令",
    icon: <MessageSquare size={20} />,
    items: [
      { action: "先双击卡片再提问", detail: "让 AI 明确你在围绕哪张卡片继续工作。" },
      { action: "输入 /", detail: "打开工作台命令菜单。" },
      { action: "+ 菜单", detail: "上传素材、从素材库导入、打开小地图、启用深入研究或 Subagents。" },
      { action: "新建对话", detail: "聊天区顶部“+”开启新线程；历史按钮可回到旧线程。" },
      { action: "语音按钮", detail: "支持语音转写或实时语音控制，取决于服务端配置。" },
    ],
  },
  {
    id: "outputs",
    title: "生成、保存、回看",
    icon: <Share2 size={20} />,
    items: [
      { action: "生成图片/视频", detail: "围绕选中卡片补充风格、比例、约束，再生成。" },
      { action: "图片详情", detail: "可下载、重新生成、局部涂抹修改、选择宽高比、分享单图。" },
      { action: "保存", detail: "会话会自动保存，也可用 /save 手动保存。" },
      { action: "历史记录", detail: "回看会话里的图片、视频、网页、文档和聊天输出。" },
      { action: "素材库", detail: "管理上传素材；公开 demo 中每个匿名访客只看到自己的历史和素材。" },
    ],
  },
];

const enSections: GuideSection[] = [
  {
    id: "start",
    title: "Start a session",
    icon: <FileUp size={20} />,
    items: [
      { action: "Upload files", detail: "The source card supports images, videos, PDFs, Word, PPT, TXT/MD/JSON." },
      { action: "Paste a link", detail: "Switch to Link, paste a URL, then click Analyze Link." },
      { action: "Analyze / Explore", detail: "Use Research on the source card. Explore is slower but creates deeper cards." },
      { action: "Keep asking", detail: "The bottom chat uses cards, materials, and context in the current session." },
    ],
  },
  {
    id: "canvas",
    title: "Canvas navigation",
    icon: <MousePointer2 size={20} />,
    items: [
      { action: "Drag blank canvas", detail: "Pan the whole canvas." },
      { action: "Mouse wheel", detail: "Scroll the canvas; Shift + wheel moves horizontally." },
      { action: "Ctrl / ⌘ + wheel", detail: "Zoom the canvas." },
      { action: "View controls", detail: "Zoom in/out, fit view, or auto-arrange." },
      { action: "Minimap", detail: "Open it from the chat + menu; click it to jump around the canvas." },
    ],
  },
  {
    id: "cards",
    title: "Cards: select, move, resize",
    icon: <Layers size={20} />,
    items: [
      { action: "Drag a card", detail: "Move it. If multiple cards are selected, they move together." },
      { action: "Double-click a card", detail: "Select it as chat context; cards with references open the reference panel." },
      { action: "Double-click a title", detail: "Rename source, generated, or blueprint cards." },
      { action: "Drag edges/corners", detail: "Resize a card." },
      { action: "Shift / Ctrl / ⌘ + click", detail: "Add or remove a card from multi-select." },
      { action: "Shift + drag blank canvas", detail: "Marquee-select cards, then group, ungroup, or arrange the selection." },
    ],
  },
  {
    id: "links",
    title: "Links, collapse, blueprint",
    icon: <GitBranch size={20} />,
    items: [
      { action: "Drag side handles", detail: "Connect one card to another." },
      { action: "Double-click a canvas link", detail: "Confirm and delete that link." },
      { action: "Click the left collapse dot", detail: "Hide/show non-generated downstream cards." },
      { action: "Double-click the collapse dot", detail: "Collapse/expand all downstream branches." },
      { action: "Triple-click the collapse dot", detail: "Expand all collapsed branches." },
      { action: "Double-click a junction dot", detail: "Open Blueprint; arrange mini-cards and draw upstream/downstream/parallel relationships." },
      { action: "Double-click a blueprint link", detail: "Add a note describing the relationship." },
    ],
  },
  {
    id: "chat",
    title: "Chat and / commands",
    icon: <MessageSquare size={20} />,
    items: [
      { action: "Double-click a card first", detail: "Tell AI which card you are working on." },
      { action: "Type /", detail: "Open the workbench command menu." },
      { action: "+ menu", detail: "Upload, import material, open minimap, deep research, or Subagents." },
      { action: "New thread", detail: "Use the chat header + button; history returns to previous threads." },
      { action: "Voice buttons", detail: "Use speech-to-text or realtime voice if configured server-side." },
    ],
  },
  {
    id: "outputs",
    title: "Generate, save, revisit",
    icon: <Share2 size={20} />,
    items: [
      { action: "Generate image/video", detail: "Select a card, add style/ratio/constraints, then generate." },
      { action: "Image detail", detail: "Download, regenerate, mask-edit, choose aspect ratio, or share one image." },
      { action: "Save", detail: "Sessions auto-save; /save also saves manually." },
      { action: "History", detail: "Review images, videos, web sources, documents, and chats." },
      { action: "Material library", detail: "Manage uploads. In the public demo, each anonymous visitor only sees their own data." },
    ],
  },
];

const zhCommands: CommandRow[] = [
  { command: "/save", detail: "保存当前会话" },
  { command: "/export", detail: "导出会话 JSON" },
  { command: "/import", detail: "导入会话 JSON" },
  { command: "/sessions", detail: "打开历史会话面板" },
  { command: "/fit", detail: "适配当前画布视图" },
  { command: "/arrange", detail: "自动整理画布" },
  { command: "/new-card 文本", detail: "新建一张文本卡片" },
  { command: "/search 关键词", detail: "搜索并定位画布卡片" },
  { command: "/material 关键词", detail: "从素材库导入" },
  { command: "/new-canvas", detail: "新建空画布" },
];

const enCommands: CommandRow[] = [
  { command: "/save", detail: "Save current session" },
  { command: "/export", detail: "Export session JSON" },
  { command: "/import", detail: "Import session JSON" },
  { command: "/sessions", detail: "Open session panel" },
  { command: "/fit", detail: "Fit current canvas" },
  { command: "/arrange", detail: "Auto-arrange canvas" },
  { command: "/new-card text", detail: "Create a text card" },
  { command: "/search keyword", detail: "Find and focus a card" },
  { command: "/material keyword", detail: "Import from material library" },
  { command: "/new-canvas", detail: "Start a blank canvas" },
];

function contentFor(lang: Lang) {
  return lang === "en"
    ? {
        sections: enSections,
        commands: enCommands,
        title: "ThoughtGrid quick guide",
        kicker: "Operation cheat sheet",
        intro: "A concise reference for the actions that are easy to miss on the canvas.",
        openWorkbench: "Open workbench",
        openHistory: "Open history",
        sectionLabel: "Jump to section",
        flowTitle: "Basic flow",
        flow: ["Upload or paste a link", "Analyze / Explore", "Double-click a card", "Ask or generate", "Save / share / revisit"],
        commandsTitle: "/ command menu",
        privacyTitle: "Public demo note",
        privacy: "History and materials are separated by anonymous browser cookie. Clearing cookies may lose the previous anonymous identity.",
      }
    : {
        sections: zhSections,
        commands: zhCommands,
        title: "织境操作速查",
        kicker: "使用介绍",
        intro: "只保留最容易漏掉的动作细节。第一次使用时，按这页查操作即可。",
        openWorkbench: "进入工作台",
        openHistory: "查看历史记录",
        sectionLabel: "跳转目录",
        flowTitle: "基本流程",
        flow: ["上传素材或粘贴链接", "分析 / 探索", "双击卡片选上下文", "追问或生成", "保存 / 分享 / 回看"],
        commandsTitle: "/ 命令菜单",
        privacyTitle: "公开 demo 说明",
        privacy: "历史记录和素材库按浏览器匿名 cookie 隔离；清理 cookie 可能会失去原来的匿名身份。",
      };
}

export default function UserGuidePage() {
  const { lang } = useI18n();
  const [navOpen, setNavOpen] = useState(false);
  const copy = useMemo(() => contentFor(lang), [lang]);

  return (
    <div className="min-h-screen bg-cabinet-bg p-3 text-cabinet-ink md:p-7">
      <AppNavigation activePage="guide" open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-[1180px] overflow-hidden rounded-[18px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)] md:min-h-[calc(100vh-3.5rem)]">
        <header className="flex h-16 items-center gap-4 border-b border-cabinet-border px-5">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded hover:bg-cabinet-itemBg"
            aria-label={lang === "en" ? "Open navigation" : "打开导航"}
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <div className="text-xs text-cabinet-inkMuted">{copy.kicker}</div>
            <h1 className="truncate text-xl font-medium tracking-[0]">{copy.title}</h1>
          </div>
        </header>

        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-cabinet-border bg-cabinet-itemBg p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-[16px] bg-cabinet-paper p-5 shadow-sm ring-1 ring-cabinet-border">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cabinet-blue text-cabinet-paper">
                <BookOpen size={20} />
              </div>
              <p className="mt-4 text-sm leading-6 text-cabinet-inkMuted">{copy.intro}</p>
              <div className="mt-5 grid gap-2">
                <a href="/app.html" className="flex h-10 items-center justify-between rounded-full bg-cabinet-blue px-4 text-sm font-medium text-cabinet-paper hover:bg-cabinet-cyan">
                  <span>{copy.openWorkbench}</span>
                  <ArrowRight size={16} />
                </a>
                <a href="/history/" className="flex h-10 items-center justify-between rounded-full border border-cabinet-border px-4 text-sm hover:bg-cabinet-bg">
                  <span>{copy.openHistory}</span>
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>

            <div className="mt-5 rounded-[16px] border border-cabinet-border bg-cabinet-paper p-5">
              <h2 className="text-sm font-medium">{copy.flowTitle}</h2>
              <div className="mt-4 grid gap-3">
                {copy.flow.map((item, index) => (
                  <div key={item} className="grid grid-cols-[28px_1fr] items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cabinet-bg text-xs font-medium text-cabinet-inkMuted">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <nav className="mt-5 rounded-[16px] border border-cabinet-border bg-cabinet-paper p-5" aria-label={copy.sectionLabel}>
              <h2 className="text-sm font-medium">{copy.sectionLabel}</h2>
              <div className="mt-3 grid gap-1">
                {copy.sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="rounded px-2 py-2 text-sm text-cabinet-inkMuted hover:bg-cabinet-bg hover:text-cabinet-ink">
                    {section.title}
                  </a>
                ))}
              </div>
            </nav>
          </aside>

          <section className="p-5 md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              {copy.sections.map((section) => (
                <article key={section.id} id={section.id} className="scroll-mt-8 rounded-[18px] border border-cabinet-border bg-cabinet-paper p-5 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-cabinet-border pb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cabinet-itemBg text-cabinet-blue ring-1 ring-cabinet-border">
                      {section.icon}
                    </div>
                    <h2 className="text-lg font-medium tracking-[0]">{section.title}</h2>
                  </div>
                  <dl className="mt-4 grid gap-3">
                    {section.items.map((item) => (
                      <div key={`${section.id}-${item.action}`} className="grid gap-1 border-b border-cabinet-border/70 pb-3 last:border-b-0 last:pb-0">
                        <dt className="text-sm font-medium">{item.action}</dt>
                        <dd className="text-sm leading-6 text-cabinet-inkMuted">{item.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
              <article className="rounded-[18px] border border-cabinet-border bg-cabinet-itemBg p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cabinet-paper text-cabinet-blue ring-1 ring-cabinet-border">
                    <Keyboard size={20} />
                  </div>
                  <h2 className="text-lg font-medium tracking-[0]">{copy.commandsTitle}</h2>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {copy.commands.map((row) => (
                    <div key={row.command} className="rounded-[12px] bg-cabinet-paper p-3 ring-1 ring-cabinet-border">
                      <code className="text-sm font-medium text-cabinet-blue">{row.command}</code>
                      <p className="mt-1 text-xs leading-5 text-cabinet-inkMuted">{row.detail}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[18px] border border-cabinet-border bg-cabinet-paper p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cabinet-itemBg text-cabinet-blue ring-1 ring-cabinet-border">
                    <Search size={20} />
                  </div>
                  <h2 className="text-lg font-medium tracking-[0]">{copy.privacyTitle}</h2>
                </div>
                <p className="mt-4 text-sm leading-6 text-cabinet-inkMuted">{copy.privacy}</p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
