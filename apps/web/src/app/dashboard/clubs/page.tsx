"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

import { trpc } from "@/utils/trpc";
import TeacherGroups from "@/components/teacher-groups";
import StudentGroups from "@/components/student-groups";

export default function DashboardClubsPage() {
    const privateData = useQuery(trpc.privateData.queryOptions());
    const userRole = (privateData.data?.user as any)?.role || "STUDENT";

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Mes clubs de lecture
                </h1>
            </div>
            <StudentGroups filterType="CLUB" />
        </div>
    );
}
