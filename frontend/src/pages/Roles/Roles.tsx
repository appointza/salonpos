import { CrudPage } from "@/components/CrudPage";
import { UsersRolesSubnav } from "@/components/UsersRolesSubnav";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { modules } from "@/lib/modules";
import { joinPaths, PERMISSION_SCREENS, permissionSummary, splitPaths } from "@/lib/permissions";
import type { Row } from "@/lib/store";

const title = "Roles & permissions — Luxe Salon CRM";
const description = "Create roles and set view or edit access for each screen.";
const ALL_PATHS = PERMISSION_SCREENS.map((s) => s.to);

function PermissionMatrix({
  editing,
  setEditing,
}: {
  editing: Row;
  setEditing: (row: Row) => void;
}) {
  const view = splitPaths(editing["view"]);
  const edit = splitPaths(editing["edit"]);
  const viewAll = view === "all";
  const editAll = edit === "all";
  const viewSet = new Set(viewAll ? ALL_PATHS : view);
  const editSet = new Set(editAll ? ALL_PATHS : edit);

  function commit(nextView: Set<string>, nextEdit: Set<string>) {
    const views = ALL_PATHS.filter((p) => nextView.has(p));
    const edits = ALL_PATHS.filter((p) => nextView.has(p) && nextEdit.has(p));
    setEditing({
      ...editing,
      view: joinPaths(views, views.length === ALL_PATHS.length),
      edit: joinPaths(edits, edits.length === ALL_PATHS.length),
    });
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Screen access</p>
          <p className="text-xs text-muted-foreground">View shows the menu. Edit allows create, update and delete.</p>
        </div>
        <div className="flex gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <Checkbox
              checked={viewAll}
              onCheckedChange={(v) => {
                if (v === true) commit(new Set(ALL_PATHS), editSet);
                else commit(new Set(), new Set());
              }}
            />
            View all
          </label>
          <label className="inline-flex items-center gap-2">
            <Checkbox
              checked={editAll}
              onCheckedChange={(v) => {
                if (v === true) commit(new Set(ALL_PATHS), new Set(ALL_PATHS));
                else commit(viewSet, new Set());
              }}
            />
            Edit all
          </label>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Screen</th>
              <th className="w-20 px-3 py-2 font-medium">View</th>
              <th className="w-20 px-3 py-2 font-medium">Edit</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_SCREENS.map((screen) => {
              const canView = viewSet.has(screen.to);
              const canEdit = editSet.has(screen.to);
              return (
                <tr key={screen.to} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <p>{screen.label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {screen.group} · {screen.to}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={canView}
                      onCheckedChange={(v) => {
                        const nextView = new Set(viewSet);
                        const nextEdit = new Set(editSet);
                        if (v === true) nextView.add(screen.to);
                        else {
                          nextView.delete(screen.to);
                          nextEdit.delete(screen.to);
                        }
                        commit(nextView, nextEdit);
                      }}
                      aria-label={`View ${screen.label}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={canEdit}
                      onCheckedChange={(v) => {
                        const nextView = new Set(viewSet);
                        const nextEdit = new Set(editSet);
                        if (v === true) {
                          nextView.add(screen.to);
                          nextEdit.add(screen.to);
                        } else nextEdit.delete(screen.to);
                        commit(nextView, nextEdit);
                      }}
                      aria-label={`Edit ${screen.label}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Page() {
  return (
    <div className="space-y-6">
      <UsersRolesSubnav />
      <CrudPage
        module={modules.roles}
        newButtonLabel="New role"
        displayValue={(field, row) => {
          if (field.name === "view" || field.name === "edit") {
            const list = splitPaths(row[field.name]);
            return list === "all" ? "All screens" : `${list.length} screens`;
          }
          return undefined;
        }}
        prepareNew={(row) => ({
          ...row,
          code: row["code"] || "STAFF",
          builtIn: "No",
          status: row["status"] || "Active",
          view: "/dashboard",
          edit: "",
        })}
        validate={(row) => {
          if (!String(row["name"] ?? "").trim()) return "Give the role a name";
          const screens = splitPaths(row["view"]);
          if (screens !== "all" && screens.length === 0) return "Pick at least one view screen";
          return null;
        }}
        extraFields={({ editing, setEditing }) => (
          <>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">{permissionSummary(editing)}</Label>
            </div>
            <PermissionMatrix editing={editing} setEditing={setEditing} />
          </>
        )}
      />
    </div>
  );
}
