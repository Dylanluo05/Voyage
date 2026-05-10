import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Debate } from '../types';
import DebateCard from './DebateCard';

interface Props {
  debate: Debate;
  currentUserId?: string;
  onDelete: () => Promise<void>;
  onAddOption: (title: string) => Promise<void>;
  onUpdateOption: (optionId: string, patch: { pros?: string[]; cons?: string[] }) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onVoteOption: (optionId: string) => Promise<void>;
  onAddComment: (text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export default function SortableDebateCard(props: Props) {
  const { debate } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `debate-${debate._id}`,
    data: { type: 'debate', day: debate.day },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-item">
      <DebateCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}
