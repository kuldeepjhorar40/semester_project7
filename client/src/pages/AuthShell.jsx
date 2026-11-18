import { GraduationCap, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';

const FEATURES = [
  { icon: MessageSquareText, text: 'Describe your issue in plain words, the AI understands it' },
  { icon: Sparkles, text: 'Instant categorisation and a unique ticket ID' },
  { icon: ShieldCheck, text: 'Track every update until it is resolved' },
];

// Shared split-screen layout for Login / Register
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-400/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400 text-navy-950">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="font-serif text-xl font-bold">UniHelp</p>
            <p className="text-[11px] uppercase tracking-widest text-gold-300">Student Grievance Redressal</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl font-bold leading-tight">Your voice matters. We make sure it is heard.</h2>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-navy-100">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-gold-300">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-navy-300">© {new Date().getFullYear()} University Grievance Cell</p>
      </div>

      <div className="flex items-center justify-center bg-white p-6 sm:p-12">
        <div className="w-full max-w-md animate-pop">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <p className="font-serif text-xl font-bold text-navy-900">UniHelp</p>
          </div>
          <h1 className="font-serif text-3xl font-bold text-navy-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
