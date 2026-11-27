import React from "react";
import { View } from "react-native";
import { Button as BaseButton, Copy as BaseCopy, Heading as BaseHeading, C as BaseC, Chip as BaseChip, PressableScale } from "../components/ui";
import { theme } from "../ui/theme";
export const C = { ...BaseC, cream: "#FFF6E5", paper: theme.colors.paper, ink: theme.colors.frame, line: "#E8D8BE", teal: "#9A641A", soft: "#FFF0D2", coral: theme.colors.coral };
export function Button(props: React.ComponentProps<typeof BaseButton>) {
 return <BaseButton {...props} style={{ ...props.style, backgroundColor: props.quiet ? C.paper : C.coral, borderColor: props.selected ? C.ink : C.line, borderWidth: props.selected ? 2 : 1 }} textStyle={{ ...props.textStyle, color: C.ink }}/>;
}
export function Copy(props: React.ComponentProps<typeof BaseCopy>) { return <BaseCopy {...props} style={[{ color: C.ink }, props.style]}/>; }
export function Heading(props: React.ComponentProps<typeof BaseHeading>) { return <BaseHeading {...props} style={[{ color: C.ink }, props.style]}/>; }
export function Status({ title, detail, success = false }: { title: string; detail?: string; success?: boolean }) {
 return <View accessibilityLiveRegion="polite" style={{ padding: 16, marginBottom: 12, borderRadius: 24, backgroundColor: success ? '#E8F1D8' : C.cream, borderWidth: 1, borderColor: C.line }}><Heading style={{ fontSize: 22 }}>{title}</Heading>{detail && <Copy>{detail}</Copy>}</View>;
}
export function Chip({ children, onPress, selected = false, disabled = false, label, maxFontSizeMultiplier, numberOfLines }: React.ComponentProps<typeof BaseChip>) {
 return <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: selected ? 2 : 1, borderColor: selected ? C.ink : C.line, backgroundColor: selected ? C.coral : C.paper }}><Copy maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={numberOfLines} style={{ fontSize: 15, fontWeight: '800' }}>{children}</Copy></PressableScale>;
}
