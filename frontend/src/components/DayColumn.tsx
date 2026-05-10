import { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  day: number;
  date?: string;
  isEmpty: boolean;
  children: ReactNode;
}

export default function DayColumn({ day, date, isEmpty, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
    data: { day },
  });

  return (
    <div
      ref={setNodeRef}
      className={`day-block ${isOver ? 'drop-target' : ''} ${isEmpty ? 'empty' : ''}`}
    >
      <h3>
        Day {day}
        {date && <span className="day-date"> · {date}</span>}
      </h3>
      {children}
      {isEmpty && <p className="muted">Drop items here, or use the form above.</p>}
    </div>
  );
}
