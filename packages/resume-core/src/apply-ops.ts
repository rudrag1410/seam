import { OpName } from "@seam/api-client";
import type { Op, Resume } from "./ast";

type Item = { id: string; bullets?: { id: string; text: string }[] };

function eachItem(doc: Resume): Item[] {
  return doc.sections.flatMap((s) => ("items" in s ? (s.items as Item[]) : []));
}

function findBullet(doc: Resume, id: string) {
  for (const item of eachItem(doc)) {
    const i = item.bullets?.findIndex((b) => b.id === id) ?? -1;
    if (i >= 0 && item.bullets) return { bullets: item.bullets, index: i };
  }
  return null;
}

function textFor(op: Op): string {
  return op.edited_text ? op.edited_text : String(op.payload.after ?? "");
}

function applyOne(doc: Resume, op: Op): void {
  const { target, payload } = op;
  switch (op.op) {
    case OpName.ReplaceText:
    case OpName.RewriteSummary: {
      const section = doc.sections.find((s) => s.id === target);
      if (section?.type === "summary") {
        section.text = textFor(op);
        return;
      }
      const found = findBullet(doc, target);
      if (found) found.bullets[found.index]!.text = textFor(op);
      return;
    }
    case OpName.Reorder: {
      const item = eachItem(doc).find((i) => i.id === target);
      if (!item?.bullets) return;
      const byId = new Map(item.bullets.map((b) => [b.id, b]));
      const order = payload.order as string[];
      const ordered = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
      const listed = new Set(ordered.map((b) => b.id));
      item.bullets = [...ordered, ...item.bullets.filter((b) => !listed.has(b.id))];
      return;
    }
    case OpName.InsertBullet: {
      const item = eachItem(doc).find((i) => i.id === target);
      item?.bullets?.push({ id: String(payload.new_id), text: textFor(op) });
      return;
    }
    case OpName.RemoveBullet: {
      const found = findBullet(doc, target);
      if (found) found.bullets.splice(found.index, 1);
      return;
    }
    case OpName.AddSkill:
    case OpName.RemoveSkill: {
      const group = doc.sections
        .flatMap((s) => (s.type === "skills" ? s.groups : []))
        .find((g) => g.id === target);
      if (!group) return;
      const value = (op.edited_text || String(payload.value ?? "")).trim();
      const at = group.items.findIndex((x) => x.toLowerCase() === value.toLowerCase());
      if (op.op === OpName.AddSkill && at < 0) group.items.push(value);
      if (op.op === OpName.RemoveSkill && at >= 0) group.items.splice(at, 1);
    }
  }
}

export function applyOps(document: Resume, ops: Op[]): Resume {
  const doc = structuredClone(document);
  for (const op of ops) applyOne(doc, op);
  return doc;
}
