import React, { isValidElement, useEffect, useRef } from 'react';
import { renderToString } from 'react-dom/server';
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
      const prompts = props.prompts?.map((prompt) => {
        return {
          icon: isValidElement(prompt.icon)
            ? renderToString(prompt.icon)
            : prompt.icon,
          text: prompt.text,
        };
      });
      const title =
        typeof props.title === 'string'
          ? props.title
          : renderToString(props.title);

      widgetRef.current = new ChatWidgetCore(containerRef.current, {
        ...props,
        prompts,
        title,
      });
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
