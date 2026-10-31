import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { SettingsTabProps } from "../../types/groupSpace.types";

export default function SettingsTab({
  groupName,
  members,
  onDissolve,
}: SettingsTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Thông tin nhóm</h2>
        <Input defaultValue={groupName} />
        <textarea
          className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600"
          defaultValue="Không gian học tập chung của nhóm."
        />
        <Button>Lưu thay đổi</Button>
      </Card>
      <Card className="space-y-4 border-red-100 bg-red-50/30">
        <h2 className="text-lg font-semibold text-red-600">
          Khu vực nguy hiểm
        </h2>
        <p className="text-sm text-gray-600">
          Giải tán nhóm sẽ thông báo cho thành viên trước 24h. Tài liệu chưa
          được lưu về cá nhân có thể chuyển sang vùng orphaned.
        </p>
        <select className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm">
          {members
            .filter((member) => !member.is_owner)
            .map((member) => (
              <option key={member.user_id}>
                {member.full_name || member.username}
              </option>
            ))}
        </select>
        <Button variant="danger" onClick={() => void onDissolve()}>
          Giải tán nhóm
        </Button>
      </Card>
    </div>
  );
}
