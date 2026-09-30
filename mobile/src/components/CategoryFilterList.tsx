import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

type FlatCategory = { id: string; name: string; parentId: string | null };

export function CategoryFilterList({
  categories,
  query,
  selectedIds,
  onToggle,
  counts,
  includeAll = false,
  totalCount = 0,
  selectParents = true,
  showCounts = true,
}: {
  categories: FlatCategory[];
  query: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
  counts: Map<string, number>;
  includeAll?: boolean;
  totalCount?: number;
  selectParents?: boolean;
  showCounts?: boolean;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>(() => {
    const open = new Set<string>();
    for (const cat of categories) {
      if (cat.parentId && selectedIds.includes(cat.id)) open.add(cat.parentId);
    }
    return [...open];
  });
  function toggleExpanded(id: string) {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }
  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const parents = categories.filter((cat) => !cat.parentId);
    const parentIds = new Set(parents.map((cat) => cat.id));
    const childrenOf = new Map<string, FlatCategory[]>();
    const orphans: FlatCategory[] = [];
    for (const cat of categories) {
      if (!cat.parentId) continue;
      if (!parentIds.has(cat.parentId)) {
        orphans.push(cat);
        continue;
      }
      const list = childrenOf.get(cat.parentId) ?? [];
      list.push(cat);
      childrenOf.set(cat.parentId, list);
    }
    const expanded = new Set(expandedIds);
    const next: FlatCategory[] = [];
    if (includeAll) next.push({ id: "", name: "Tümü", parentId: null });
    for (const parent of parents) {
      const children = childrenOf.get(parent.id) ?? [];
      const parentHit = !q || parent.name.toLowerCase().includes(q);
      const childHits = q
        ? children.filter((child) => child.name.toLowerCase().includes(q))
        : children;
      if (q && !parentHit && childHits.length === 0) continue;
      next.push(parent);
      const open = Boolean(q) || expanded.has(parent.id);
      if (!open) continue;
      next.push(...(q && !parentHit ? childHits : children));
    }
    for (const orphan of orphans) {
      if (q && !orphan.name.toLowerCase().includes(q)) continue;
      next.push(orphan);
    }
    return next;
  }, [categories, expandedIds, includeAll, q]);

  const childTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const cat of categories) {
      if (!cat.parentId) continue;
      totals.set(cat.parentId, (totals.get(cat.parentId) ?? 0) + (counts.get(cat.id) ?? 0));
    }
    return totals;
  }, [categories, counts]);

  const parentsWithChildren = useMemo(() => {
    const ids = new Set<string>();
    for (const cat of categories) {
      if (cat.parentId) ids.add(cat.parentId);
    }
    return ids;
  }, [categories]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id || "all"}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={5}
      updateCellsBatchingPeriod={40}
      style={styles.list}
      renderItem={({ item }) => {
        const isAll = item.id === "";
        const isParentHeading = !selectParents && !item.parentId && !isAll;
        const active = isParentHeading
          ? false
          : isAll
            ? selectedIds.length === 0
            : selectedIds.includes(item.id);
        const hasChildren = parentsWithChildren.has(item.id);
        const open = Boolean(q) || expandedIds.includes(item.id);
        const count = isAll
          ? totalCount
          : (counts.get(item.id) ?? 0) + (childTotals.get(item.id) ?? 0);
        return (
          <Pressable
            onPress={() => {
              if (isParentHeading) {
                if (hasChildren) toggleExpanded(item.id);
                return;
              }
              onToggle(item.id);
            }}
            style={active ? styles.rowOn : isParentHeading ? styles.heading : styles.row}
          >
            {isParentHeading ? null : (
              <View style={active ? styles.checkOn : styles.checkOff}>
                {active ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            )}
            <Text
              style={[
                active ? styles.nameOn : item.parentId ? styles.child : styles.name,
                item.parentId ? styles.indent : null,
              ]}
            >
              {item.name}
            </Text>
            {showCounts ? <Text style={active ? styles.countOn : styles.count}>{count}</Text> : null}
            {hasChildren ? (
              <Pressable hitSlop={10} onPress={() => toggleExpanded(item.id)} style={styles.arrowHit}>
                <Text style={styles.arrow}>{open ? "▾" : "▸"}</Text>
              </Pressable>
            ) : (
              <View style={styles.arrowHit} />
            )}
          </Pressable>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>Kategori bulunamadı</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  row: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heading: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowOn: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: "#e8eef5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkOff: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  checkOn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  name: { color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 },
  nameOn: { color: colors.navy, fontWeight: "800", fontSize: 15, flex: 1 },
  child: { color: colors.text, fontSize: 14, flex: 1 },
  indent: { paddingLeft: 10 },
  count: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  countOn: { color: colors.navy, fontWeight: "800", fontSize: 13 },
  arrowHit: { width: 28, alignItems: "center", justifyContent: "center" },
  arrow: { color: colors.navy, fontSize: 16, fontWeight: "800" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 24 },
});
