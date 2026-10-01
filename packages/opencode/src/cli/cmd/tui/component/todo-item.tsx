import { useTheme } from "../context/theme"

export interface TodoItemProps {
  status: string
  content: string
}

export function TodoItem(props: TodoItemProps) {
  const { theme } = useTheme()

  // Each todo is a single pill. The marker sits left, the text is allowed to
  // wrap inside the rail, and done items sit at the muted end of the sheet so
  // the open ones keep the focus. Nothing is boxed - the pill is the whole
  // shape, which is what keeps the rail quiet.
  return (
    <box flexDirection="row" gap={1} flexShrink={0} alignItems="center">
      <text
        flexShrink={0}
        selectable={false}
        style={{
          fg: props.status === "in_progress" ? theme.warning : theme.textMuted,
        }}
      >
        {props.status === "completed" ? "√" : props.status === "in_progress" ? "›" : " "}
      </text>
      <text
        flexGrow={1}
        wrapMode="word"
        selectable={false}
        style={{
          fg: props.status === "in_progress" ? theme.warning : theme.textMuted,
        }}
      >
        {props.content}
      </text>
    </box>
  )
}
