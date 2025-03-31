import React, { useEffect, useRef } from 'react';
import { ChatWidgetCore } from '../core/ChatWidget';
import { ChatWidgetOptions } from '../core/types';

export interface ChatWidgetProps extends ChatWidgetOptions {
  className?: string;
  style?: React.CSSProperties;
}

export const ChatWidget: React.FC<ChatWidgetProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ChatWidgetCore | null>(null);

  useEffect(() => {
    if (containerRef.current && !widgetRef.current) {
      widgetRef.current = new ChatWidgetCore(containerRef.current, props);
    }

    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
        widgetRef.current = null;
      }
    };
  }, []);

  // Update options if they change
  useEffect(() => {
    if (widgetRef.current) {
      widgetRef.current.updateParams(props.params);
    }
  }, [props.params]);

  return (
    <div ref={containerRef} className={props.className} style={props.style} />
  );
};

export const DynamiqAssistant = ChatWidget;
export type DynamiqAssistantProps = ChatWidgetProps;
