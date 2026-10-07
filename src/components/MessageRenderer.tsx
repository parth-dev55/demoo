import React from 'react';
import Markdown from 'react-markdown';
import { ChartVisualizer, WeatherVisualizer, ProductsVisualizer, FollowupVisualizer, MapVisualizer, OrderTrackerVisualizer, FormVisualizer } from './Visualizers';

export function MessageRenderer({ content, onSelectFollowup }: { content: string, onSelectFollowup?: (q: string) => void }) {
  // We need to parse custom JSON blocks from the markdown.
  // We can use a regex to find blocks like ```json:chart ... ```
  
  const blockRegex = /```json:(chart|weather|products|followup|map|order_tracking|form)\n([\s\S]*?)\n```/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.substring(lastIndex, match.index) });
    }

    const type = match[1];
    const jsonStr = match[2];
    try {
      const data = JSON.parse(jsonStr);
      parts.push({ type, data });
    } catch (e) {
      // If JSON parsing fails, just render it as normal code block text
      parts.push({ type: 'text', content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.substring(lastIndex) });
  }

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          const text = part.content.trim();
          if (!text) return null;
          return (
            <div key={index} className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-a:text-emerald-400 prose-strong:text-zinc-200 prose-img:rounded-xl prose-img:shadow-lg prose-img:border prose-img:border-zinc-800">
              <Markdown>{text}</Markdown>
            </div>
          );
        } else if (part.type === 'chart') {
          return <ChartVisualizer key={index} data={part.data} />;
        } else if (part.type === 'weather') {
          return <WeatherVisualizer key={index} data={part.data} />;
        } else if (part.type === 'products') {
          return <ProductsVisualizer key={index} data={part.data} />;
        } else if (part.type === 'order_tracking') {
          return <OrderTrackerVisualizer key={index} data={part.data} />;
        } else if (part.type === 'map') {
          return <MapVisualizer key={index} data={part.data} />;
        } else if (part.type === 'form') {
          return <FormVisualizer key={index} data={part.data} />;
        } else if (part.type === 'followup') {
          return <FollowupVisualizer key={index} data={part.data} onSelect={onSelectFollowup} />;
        }
        return null;
      })}
    </div>
  );
}
