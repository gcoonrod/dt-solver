"use client";

import WaveformTimeline from "@/components/canvas/WaveformTimeline";
import ChannelLabels from "@/components/features/ChannelLabels";
import WaveformToolbar from "@/components/features/WaveformToolbar";
import CornerLabel from "@/components/ui/CornerLabel";

export default function WaveformWorkspace() {
  return (
    <div className="flex flex-col overflow-hidden h-full">
      <WaveformToolbar />
      <div className="flex-1 flex overflow-hidden">
        <ChannelLabels />
        <div className="flex-1 relative overflow-hidden">
          <WaveformTimeline />
          <CornerLabel />
        </div>
      </div>
    </div>
  );
}
