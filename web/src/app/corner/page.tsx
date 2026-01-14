import { CHANGELOG } from "@/data/changelog";
import { CORNER_POSTS } from "@/data/corner";
import { Terminal, MoveLeft, History } from "lucide-react";
import Link from "next/link";

export default function PhloidsCorner() {
    return (
        <div className="min-h-screen bg-black text-slate-400 font-mono p-6 md:p-12 selection:bg-emerald-900 selection:text-emerald-200">
            <div className="max-w-2xl mx-auto flex flex-col gap-12">

                {/* Header */}
                <header className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-6 h-6 text-emerald-500" />
                        <h1 className="text-xl font-bold text-slate-200 tracking-tight">Phloid's Corner</h1>
                    </div>
                    <Link href="/weatherwars" className="text-xs group flex items-center gap-2 hover:text-emerald-400 transition-colors">
                        <MoveLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>RETURN TO DASHBOARD</span>
                    </Link>
                </header>

                {/* Section: Philosophy (Blog) */}
                <section className="space-y-6">
                    {CORNER_POSTS.map(post => (
                        <article key={post.id} className="space-y-4">
                            <div className="flex items-baseline justify-between">
                                <h2 className="text-lg font-bold text-white tracking-wide uppercase">{post.title}</h2>
                                <span className="text-xs text-slate-600">{post.date}</span>
                            </div>
                            <div className="prose prose-invert prose-slate prose-sm md:prose-base leading-relaxed opacity-90">
                                {post.content.split('\n\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                ))}
                            </div>
                        </article>
                    ))}
                </section>

                <hr className="border-slate-800" />

                {/* Section: Changelog */}
                <section className="space-y-8">
                    <div className="flex items-center gap-2 mb-6">
                        <History className="w-5 h-5 text-slate-600" />
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">System Changelog</h3>
                    </div>

                    <div className="border-l border-slate-800 pl-6 space-y-12">
                        {CHANGELOG.map((log, i) => (
                            <div key={i} className="relative">
                                {/* Dot */}
                                <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-slate-900 border border-slate-700" />

                                <div className="flex flex-col gap-2 mb-4">
                                    <span className="text-xs text-emerald-500/50 font-bold font-mono">{log.date}</span>
                                    <h4 className="text-slate-300 font-bold">{log.title}</h4>
                                </div>
                                <ul className="space-y-2">
                                    {log.points.map((pt, j) => (
                                        <li key={j} className="text-sm text-slate-500 leading-relaxed hover:text-slate-400 transition-colors">
                                            - {pt}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="pt-12 text-center text-[10px] text-slate-700 uppercase tracking-widest">
                    Pip OS // End of File
                </footer>

            </div>
        </div>
    );
}
