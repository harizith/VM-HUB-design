import Clock from "@/components/Clock";
import LoginForm from "@/components/LoginForm";
import { ShieldCheck, Award, BookOpen, GraduationCap, Building2, Bell, Phone, Mail } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Institutional Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-[#0b1324]/90 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {/* College Crest Emulation */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-900/30 shrink-0">
              <Building2 className="text-blue-300 w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold tracking-wider text-blue-400 uppercase">
                Vel Tech Multi Tech Dr. Rangarajan Dr. Sakunthala Engineering College
              </div>
              <div className="text-xs text-slate-400 font-medium">
                An Autonomous Institution • Affiliated to Anna University, Chennai • Approved by AICTE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              <Award className="w-3.5 h-3.5" /> NAAC &apos;A++&apos; Grade
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> NBA Accredited
            </span>
            <span className="px-2 py-0.5 text-[11px] bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
              AMIS v4.8
            </span>
          </div>
        </div>
      </header>

      {/* Campus Notice Ticker Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="flex items-center gap-1 text-amber-400 font-bold shrink-0 uppercase tracking-wider text-[11px]">
            <Bell className="w-3.5 h-3.5" /> Campus Circulars:
          </span>
          <div className="overflow-hidden whitespace-nowrap text-slate-300 font-medium">
            <span className="inline-block animate-marquee hover:pause">
              Continuous Internal Assessment (CIA-II) Marks Entry Open • Odd Semester Attendance Condonation Submission Deadline Nov 15 • Anna University Regulation 2023 75% Minimum Attendance Enforced • Autonomous Board of Studies Meeting Scheduled
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Portal Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-8 items-center">
        {/* Left Col: Institutional Overview & Clock */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" /> Academic Management Information System
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Enterprise Academic &amp; Student Portal (VM-HUB)
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Official centralized portal for academic scheduling, student attendance monitoring, semester grade reporting, and institutional governance.
            </p>
          </div>

          {/* Academic Clock Container */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-2xl backdrop-blur-sm flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="space-y-2 text-center sm:text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Institutional Academic Clock
              </div>
              <div className="text-lg font-bold text-white">
                Vel Tech Multi Tech Campus Schedule
              </div>
              <p className="text-xs text-slate-400 max-w-xs">
                Synchronized with the Registrar Office bell schedule, active period progression, and Anna University day order.
              </p>
            </div>
            <div className="shrink-0 flex items-center justify-center p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <Clock size={160} subtext="CAMPUS TIME" />
            </div>
          </div>

          {/* College Key Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-1">
                <BookOpen className="w-4 h-4" /> CBCS Curriculum
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Regulation 2023 with choice-based electives.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                <ShieldCheck className="w-4 h-4" /> Anna Univ Norms
              </div>
              <p className="text-[11px] text-slate-400">Mandatory 75% attendance threshold monitoring &amp; condonation.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
                <Building2 className="w-4 h-4" /> Department Nodes
              </div>
              <p className="text-[11px] text-slate-400">Integrated records for CSE, IT, ECE, EEE, MECH, AI&amp;DS, BME.</p>
            </div>
          </div>
        </div>

        {/* Right Col: Official Login Form */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Official Institutional Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d18] px-4 py-6 sm:px-8 mt-auto text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-300">
              Vel Tech Multi Tech Dr. Rangarajan Dr. Sakunthala Engineering College (Autonomous)
            </p>
            <p className="text-slate-500 text-[11px]">
              #42, Avadi - Vel Tech Road, Vel Nagar, Avadi, Chennai, Tamil Nadu 600062
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-400" /> ERP Cell: Ext 402 / 405
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" /> erp-support@veltechmultitech.org
            </span>
            <span className="text-slate-500">
              Server Node: VMT-CHENNAI-DC01
            </span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-800/50 mt-4 pt-3 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500">
          <span>&copy; 2026 Vel Tech Multi Tech. Developed by Centre for Web Development &amp; Information Systems.</span>
          <span>Confidential Academic Data • Strictly for Authorized Campus Personnel</span>
        </div>
      </footer>
    </div>
  );
}
