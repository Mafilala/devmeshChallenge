"use client";
import { Header } from "@/components/layout/Header";
import { Sidebar, SidebarSection } from "@/components/layout/Sidebar";
import { VideoFeed } from "@/components/feed/VideoFeed";
import { ROIPanel } from "@/components/roi/ROIPanel";
import { StatsGrid } from "@/components/stats/StatsGrid";
import { EventLog } from "@/components/log/EventLog";
import { useStream } from "@/hooks/useStream";

export default function Home() {
  const { connState, currentROI, stats, logs, isStreaming, start, stop } = useStream();

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <Header connState={connState} />

      <main className="flex flex-1 overflow-hidden">
        {/* Video panel */}
        <VideoFeed
          isStreaming={isStreaming}
          onStart={start}
          onStop={stop}
        />

        {/* Sidebar */}
        <Sidebar>
          <SidebarSection>
            <ROIPanel roi={currentROI} />
          </SidebarSection>

          <SidebarSection>
            <StatsGrid stats={stats} />
          </SidebarSection>

          <SidebarSection>
            <EventLog logs={logs} />
          </SidebarSection>
        </Sidebar>
      </main>
    </div>
  );
}
