using Krios.Models;
using Krios.Models.Krios;
using Krios.Utils;
using System.Globalization;

namespace Krios.Services.Krios
{
    public class PageService
    {
        private static readonly string[] Weekdays =
        {
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
        };

        private static readonly string[] DefaultTimeSlots =
        {
            "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
            "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
        };

        private static readonly string[] ScheduleColors = { "primary", "secondary", "accent", "purple" };

        private static readonly string[] RequiredOnboardingCategories =
        {
            "academic_year", "grade", "class_section", "subject", "department"
        };

        private readonly IDbProvider dbprovider;
        private readonly RequestState requeststate;
        private readonly ClassService classService;
        private readonly StaffService staffService;
        private readonly StudentService studentService;
        private readonly StudentEnrollmentService studentEnrollmentService;
        private readonly StaffScheduleService staffScheduleService;
        private readonly ReferenceValueService referenceValueService;
        private readonly TermService termService;
        private readonly AttendanceService attendanceService;
        private readonly DashboardService dashboardService;

        public PageService(
            IDbProvider dbprovider,
            RequestState requeststate,
            ClassService classService,
            StaffService staffService,
            StudentService studentService,
            StudentEnrollmentService studentEnrollmentService,
            StaffScheduleService staffScheduleService,
            ReferenceValueService referenceValueService,
            TermService termService,
            AttendanceService attendanceService,
            DashboardService dashboardService)
        {
            this.dbprovider = dbprovider;
            this.requeststate = requeststate;
            this.classService = classService;
            this.staffService = staffService;
            this.studentService = studentService;
            this.studentEnrollmentService = studentEnrollmentService;
            this.staffScheduleService = staffScheduleService;
            this.referenceValueService = referenceValueService;
            this.termService = termService;
            this.attendanceService = attendanceService;
            this.dashboardService = dashboardService;
        }

        public async Task<StaffDashboardPageRes> GetStaffDashboardPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);
            var staffId = await staffService.ResolveStaffIdAsync(orgId, req.staffid, req.email);

            var assignedClasses = await classService.GetAssignedToStaff(new ClassAssignedToStaffReq
            {
                organizationid = orgId,
                staffid = staffId,
            });

            var allSchedules = await staffScheduleService.Select(new StaffScheduleSelectReq
            {
                organizationid = orgId,
                staffid = staffId,
            });

            var (schedules, classById) = FilterSchedulesForStaff(assignedClasses, allSchedules);

            var now = DateTime.Now;
            var todayKey = now.ToString("dddd", CultureInfo.InvariantCulture);
            var todaySchedules = schedules
                .Where(s => string.Equals(s.day, todayKey, StringComparison.OrdinalIgnoreCase))
                .OrderBy(s => s.starttime)
                .ToList();

            var todayClasses = todaySchedules.Select(slot =>
            {
                classById.TryGetValue(slot.classid ?? "", out var cls);
                var status = ResolveClassSlotStatus(now, slot.starttime, slot.endtime);
                return new StaffTodayClassItem
                {
                    subject = slot.subject ?? "Lesson",
                    classname = cls?.name ?? slot.classname ?? "Class",
                    time = FormatTimeRange(FormatTimeSpan(slot.starttime), FormatTimeSpan(slot.endtime)),
                    status = status,
                };
            }).ToList();

            var assignedClassIds = classById.Keys.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var enrollments = await GetCurrentEnrollmentsForClasses(orgId, assignedClassIds);
            var totalStudents = enrollments
                .Select(e => e.studentid)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .LongCount();

            var classesToday = todaySchedules.Count;
            var attendanceMarked = await BuildAttendanceMarkedAsync(orgId, todaySchedules);
            var nextClassIn = BuildNextClassIn(now, todaySchedules);

            return new StaffDashboardPageRes
            {
                totalstudents = totalStudents,
                classestoday = classesToday,
                attendancemarked = attendanceMarked,
                nextclassin = nextClassIn,
                todayclasses = todayClasses,
            };
        }

        public async Task<StaffClassesPageRes> GetStaffClassesPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);
            var staffId = await staffService.ResolveStaffIdAsync(orgId, req.staffid, req.email);

            var assignedClasses = await classService.GetAssignedToStaff(new ClassAssignedToStaffReq
            {
                organizationid = orgId,
                staffid = staffId,
            });

            var schedules = await staffScheduleService.Select(new StaffScheduleSelectReq
            {
                organizationid = orgId,
                staffid = staffId,
            });

            var assignedClassIds = assignedClasses
                .Select(c => c.id)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var enrollments = await GetCurrentEnrollmentsForClasses(orgId, assignedClassIds);
            var studentsByClass = enrollments
                .GroupBy(e => e.classid ?? "", StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);

            var cards = assignedClasses.Select(cls =>
            {
                var classSchedules = schedules
                    .Where(s => string.Equals(s.classid, cls.id, StringComparison.OrdinalIgnoreCase))
                    .ToList();
                var subjects = classSchedules
                    .Select(s => s.subject)
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Distinct(StringComparer.OrdinalIgnoreCase);
                var scheduleDays = classSchedules
                    .Select(s => s.day)
                    .Where(d => !string.IsNullOrWhiteSpace(d))
                    .Distinct(StringComparer.OrdinalIgnoreCase);
                var firstTimeRange = classSchedules.FirstOrDefault() is { } first
                    ? FormatTimeRange(FormatTimeSpan(first.starttime), FormatTimeSpan(first.endtime))
                    : "";

                return new StaffClassCardItem
                {
                    id = cls.id ?? "",
                    name = cls.name ?? "",
                    subject = string.Join(", ", subjects).Trim().Length > 0 ? string.Join(", ", subjects) : "N/A",
                    students = studentsByClass.TryGetValue(cls.id ?? "", out var count) ? count : 0,
                    room = string.IsNullOrWhiteSpace(cls.room) ? "N/A" : cls.room,
                    schedule = scheduleDays.Any()
                        ? $"{string.Join(", ", scheduleDays)}{(string.IsNullOrWhiteSpace(firstTimeRange) ? "" : $" - {firstTimeRange}")}"
                        : "N/A",
                };
            }).ToList();

            var totalMinutes = schedules.Sum(s => Math.Max(0, (s.endtime - s.starttime).TotalMinutes));
            var totalStudents = cards.Sum(c => c.students);

            return new StaffClassesPageRes
            {
                totalstudents = totalStudents,
                totalhours = (long)Math.Round(totalMinutes / 60.0, MidpointRounding.AwayFromZero),
                classes = cards,
            };
        }

        public async Task<StaffStudentsPageRes> GetStaffStudentsPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);
            var staffId = await staffService.ResolveStaffIdAsync(orgId, req.staffid, req.email);

            var assignedClasses = await classService.GetAssignedToStaff(new ClassAssignedToStaffReq
            {
                organizationid = orgId,
                staffid = staffId,
            });

            var assignedClassIds = assignedClasses
                .Select(c => c.id)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var refs = MapReferenceValues(await referenceValueService.Select(new ReferenceValueSelectReq
            {
                organizationid = orgId,
            }));

            var allEnrollments = await studentEnrollmentService.SelectWithProfile(new StudentEnrollmentSelectReq
            {
                organizationid = orgId,
                iscurrent = true,
            });

            var students = allEnrollments
                .Where(e => assignedClassIds.Contains(e.classid ?? ""))
                .GroupBy(e => e.enrollmentid ?? "", StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .Select(e => new StaffStudentRowItem
                {
                    enrollmentid = e.enrollmentid,
                    studentid = e.studentid,
                    admissionnumber = e.admissionnumber,
                    firstname = e.firstname,
                    lastname = e.lastname,
                    fullname = e.fullname,
                    email = e.email,
                    phone = e.phone,
                    academicyear = e.academicyear,
                    classid = e.classid,
                    classname = e.classname,
                    grade = e.grade,
                    section = e.section,
                    rollnumber = e.rollnumber,
                    enrollmentstatus = e.enrollmentstatus,
                    status = e.status,
                    iscurrent = e.iscurrent,
                    studentstatus = e.studentstatus,
                    admissiondate = e.admissiondate,
                    joineddate = e.joineddate,
                    displayname = ResolveDisplayName(e.firstname, e.lastname, e.fullname, e.email),
                })
                .ToList();

            var classOptions = assignedClasses.Select(c => new StaffClassOptionItem
            {
                id = c.id ?? "",
                name = c.name ?? "",
                grade = ResolveRefName(refs, "grade", c.grade) is var gradeName && !string.IsNullOrWhiteSpace(gradeName)
                    ? gradeName
                    : c.grade ?? "",
                section = ResolveRefName(refs, "class_section", c.section) is var sectionName && !string.IsNullOrWhiteSpace(sectionName)
                    ? sectionName
                    : c.section ?? "",
                academicyear = ResolveRefName(refs, "academic_year", c.academicyear) is var yearName && !string.IsNullOrWhiteSpace(yearName)
                    ? yearName
                    : c.academicyear ?? "",
            }).ToList();

            return new StaffStudentsPageRes
            {
                staffid = staffId,
                students = students,
                classes = classOptions,
                referencevalues = refs,
                academicyears = assignedClasses
                    .Select(c => c.academicyear)
                    .Where(v => !string.IsNullOrWhiteSpace(v))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(v => v, StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                sections = assignedClasses
                    .Select(c => c.section)
                    .Where(v => !string.IsNullOrWhiteSpace(v))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(v => v, StringComparer.OrdinalIgnoreCase)
                    .ToList(),
            };
        }

        public async Task<StaffSchedulePageRes> GetStaffSchedulePage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);
            var staffId = await staffService.ResolveStaffIdAsync(orgId, req.staffid, req.email);

            var schedules = await staffScheduleService.Select(new StaffScheduleSelectReq
            {
                organizationid = orgId,
                staffid = staffId,
            });

            var periodRefs = MapReferenceValues(await referenceValueService.Select(new ReferenceValueSelectReq
            {
                organizationid = orgId,
                category = "period",
            }))
            .OrderBy(r => r.displayorder)
            .ToList();

            var timeSlots = periodRefs.Count > 0
                ? periodRefs.Select(r => r.name).ToList()
                : DefaultTimeSlots.ToList();

            var cells = new List<StaffScheduleGridCell>();
            foreach (var schedule in schedules)
            {
                var day = NormalizeWeekday(schedule.day);
                if (string.IsNullOrWhiteSpace(day))
                    continue;

                var slot = FindMatchingTimeSlot(timeSlots, schedule.starttime, schedule.endtime);
                if (string.IsNullOrWhiteSpace(slot))
                    continue;

                cells.Add(new StaffScheduleGridCell
                {
                    day = day,
                    timeslot = slot,
                    classname = schedule.classname ?? "N/A",
                    room = string.IsNullOrWhiteSpace(schedule.room) ? "N/A" : schedule.room,
                    color = ResolveScheduleColor(schedule.classid),
                });
            }

            return new StaffSchedulePageRes
            {
                weekdays = Weekdays.ToList(),
                timeslots = timeSlots,
                cells = cells,
            };
        }

        public async Task<AdminStudentsPageRes> GetAdminStudentsPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);

            var refs = MapReferenceValues(await referenceValueService.Select(new ReferenceValueSelectReq
            {
                organizationid = orgId,
            }));

            var enrollments = await studentEnrollmentService.SelectWithProfile(new StudentEnrollmentSelectReq
            {
                organizationid = orgId,
                iscurrent = true,
            });

            var classes = await classService.Select(new ClassSelectReq { organizationid = orgId });

            var rows = enrollments.Select(e =>
            {
                var gradeLabel = !string.IsNullOrWhiteSpace(e.classname)
                    ? e.classname
                    : string.Join("-", new[] { e.grade, e.section }.Where(x => !string.IsNullOrWhiteSpace(x)));
                if (!string.IsNullOrWhiteSpace(e.academicyear))
                    gradeLabel = $"{gradeLabel} ({e.academicyear})";

                return new AdminStudentRowItem
                {
                    id = e.studentid ?? "",
                    studentid = !string.IsNullOrWhiteSpace(e.admissionnumber) ? e.admissionnumber : e.studentid ?? "",
                    name = ResolveDisplayName(e.firstname, e.lastname, e.fullname, e.email),
                    grade = gradeLabel.Trim(),
                    email = e.email ?? "",
                    phone = e.phone ?? "",
                    status = string.IsNullOrWhiteSpace(e.status) ? "current" : e.status,
                };
            }).ToList();

            var classOptions = classes.Select(c => new StaffClassOptionItem
            {
                id = c.id ?? "",
                name = c.name ?? "",
                grade = ResolveRefName(refs, "grade", c.grade) is var gradeName && !string.IsNullOrWhiteSpace(gradeName)
                    ? gradeName
                    : c.grade ?? "",
                section = ResolveRefName(refs, "class_section", c.section) is var sectionName && !string.IsNullOrWhiteSpace(sectionName)
                    ? sectionName
                    : c.section ?? "",
                academicyear = ResolveRefName(refs, "academic_year", c.academicyear) is var yearName && !string.IsNullOrWhiteSpace(yearName)
                    ? yearName
                    : c.academicyear ?? "",
            }).ToList();

            return new AdminStudentsPageRes
            {
                rows = rows,
                classoptions = classOptions,
                referencevalues = refs,
            };
        }

        public async Task<AdminStaffPageRes> GetAdminStaffPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);

            var refs = MapReferenceValues(await referenceValueService.Select(new ReferenceValueSelectReq
            {
                organizationid = orgId,
            }));

            var staffList = await staffService.Select(new StaffSelectReq { organizationid = orgId });

            var staffRows = staffList.Select(s => new AdminStaffRowItem
            {
                id = s.id ?? "",
                staffid = s.staffid ?? s.id ?? "",
                firstname = s.firstname ?? "",
                lastname = s.lastname ?? "",
                fullname = ResolveDisplayName(s.firstname, s.lastname, s.fullname, s.email),
                email = s.email ?? "",
                phone = s.phone ?? "",
                role = s.role ?? "",
                rolename = ResolveRefName(refs, "staff_role", s.role),
                department = s.department ?? "",
                departmentname = ResolveRefName(refs, "department", s.department),
                status = s.status ?? "",
                subjects = s.subjects_json ?? "",
            }).ToList();

            return new AdminStaffPageRes
            {
                staff = staffRows,
                referencevalues = refs,
            };
        }

        public async Task<AdminTermsPageRes> GetAdminTermsPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);

            var refs = MapReferenceValues(await referenceValueService.Select(new ReferenceValueSelectReq
            {
                organizationid = orgId,
            }));

            var terms = await termService.Select(new TermSelectReq { organizationid = orgId });

            var rows = terms.Select(t => new AdminTermRowItem
            {
                id = t.id ?? "",
                name = t.name ?? "",
                startdate = t.startdate == DateTime.MinValue
                    ? ""
                    : t.startdate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                enddate = t.enddate == DateTime.MinValue
                    ? ""
                    : t.enddate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                status = t.status ?? "",
                academicyear = t.academicyear ?? "",
                academicyearname = ResolveRefName(refs, "academic_year", t.academicyear),
                description = t.description ?? "",
            }).ToList();

            return new AdminTermsPageRes
            {
                terms = rows,
                referencevalues = refs,
            };
        }

        public async Task<AdminClassesPageRes> GetAdminClassesPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);

            var refs = MapReferenceValues(await referenceValueService.Select(new ReferenceValueSelectReq
            {
                organizationid = orgId,
            }));

            var classes = await classService.Select(new ClassSelectReq { organizationid = orgId });
            var staffList = await staffService.Select(new StaffSelectReq { organizationid = orgId });
            var terms = await termService.Select(new TermSelectReq { organizationid = orgId });

            var classIds = classes
                .Select(c => c.id)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var enrollments = await GetCurrentEnrollmentsForClasses(orgId, classIds);
            var studentsByClass = enrollments
                .GroupBy(e => e.classid ?? "", StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);

            var staffById = staffList.ToDictionary(
                s => s.staffid ?? s.id ?? "",
                s => ResolveDisplayName(s.firstname, s.lastname, s.fullname, s.email),
                StringComparer.OrdinalIgnoreCase);

            var classRows = classes.Select(c =>
            {
                staffById.TryGetValue(c.classteacherid ?? "", out var teacherName);
                staffById.TryGetValue(c.classteacherid ?? "", out var mentorName);
                staffById.TryGetValue(c.assistantmentorid ?? "", out var assistantName);

                return new AdminClassRowItem
                {
                    id = c.id ?? "",
                    name = c.name ?? "",
                    subject = "All Subjects",
                    teacher = !string.IsNullOrWhiteSpace(c.classteachername) ? c.classteachername : teacherName ?? "Not Assigned",
                    students = studentsByClass.TryGetValue(c.id ?? "", out var count)
                        ? count
                        : c.currentenrollment,
                    room = c.room ?? "",
                    schedule = "Mon-Fri, 8:00 AM - 3:00 PM",
                    mentorid = c.classteacherid ?? "",
                    mentorname = !string.IsNullOrWhiteSpace(c.classteachername) ? c.classteachername : mentorName ?? "",
                    assistantmentorid = c.assistantmentorid ?? "",
                    assistantmentorname = !string.IsNullOrWhiteSpace(c.assistantmentorname) ? c.assistantmentorname : assistantName ?? "",
                    grade = c.grade ?? "",
                    section = c.section ?? "",
                    capacity = c.capacity,
                    academicyear = c.academicyear ?? "",
                    termid = c.termid ?? "",
                    status = c.status ?? "",
                };
            }).ToList();

            return new AdminClassesPageRes
            {
                classes = classRows,
                referencevalues = refs,
                staffoptions = staffList.Select(s => new AdminStaffOptionItem
                {
                    id = s.staffid ?? s.id ?? "",
                    name = ResolveDisplayName(s.firstname, s.lastname, s.fullname, s.email),
                }).ToList(),
                termoptions = terms.Select(t => new AdminTermOptionItem
                {
                    id = t.id ?? "",
                    name = t.name ?? "",
                }).ToList(),
            };
        }

        public async Task<AdminSettingsPageRes> GetAdminSettingsPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);

            var refs = MapReferenceValues(await referenceValueService.Select(new ReferenceValueSelectReq
            {
                organizationid = orgId,
            }));

            var categoryCounts = refs
                .GroupBy(r => NormalizeCategory(r.category))
                .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);

            return new AdminSettingsPageRes
            {
                referencevalues = refs,
                categorycounts = categoryCounts,
            };
        }

        public async Task<AdminOnboardingPageRes> GetAdminOnboardingPage(PageReq req)
        {
            var orgId = ResolveOrganizationId(req.organizationid);

            var refs = MapReferenceValues(await referenceValueService.Select(new ReferenceValueSelectReq
            {
                organizationid = orgId,
            }));

            var terms = await termService.Select(new TermSelectReq { organizationid = orgId });

            var categoryCounts = refs
                .GroupBy(r => NormalizeCategory(r.category))
                .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);

            var completedSteps = RequiredOnboardingCategories.Count(cat => (categoryCounts.TryGetValue(cat, out var count) ? count : 0) > 0);
            if (terms.Count > 0)
                completedSteps++;

            var totalSteps = RequiredOnboardingCategories.Length + 1;
            var isComplete = completedSteps == totalSteps;

            var termRows = terms.Select(t => new AdminTermRowItem
            {
                id = t.id ?? "",
                name = t.name ?? "",
                startdate = t.startdate == DateTime.MinValue
                    ? ""
                    : t.startdate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                enddate = t.enddate == DateTime.MinValue
                    ? ""
                    : t.enddate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                status = t.status ?? "",
                academicyear = t.academicyear ?? "",
                academicyearname = ResolveRefName(refs, "academic_year", t.academicyear),
                description = t.description ?? "",
            }).ToList();

            return new AdminOnboardingPageRes
            {
                referencevalues = refs,
                terms = termRows,
                iscomplete = isComplete,
                progresspercent = (int)Math.Round(100.0 * completedSteps / totalSteps, MidpointRounding.AwayFromZero),
            };
        }

        private string ResolveOrganizationId(string orgId)
        {
            var org = orgId?.Trim() ?? "";
            if (!string.IsNullOrWhiteSpace(org))
                return org;
            if (requeststate.usercontext?.organisationid > 0)
                return requeststate.usercontext.organisationid.ToString(CultureInfo.InvariantCulture);
            throw new AppException(AppException.ErrorCodes.BadRequest, "Organization ID is required.");
        }

        private static List<ReferenceValueItem> MapReferenceValues(List<ReferenceValue> values)
        {
            return values.Select(v => new ReferenceValueItem
            {
                id = v.id ?? "",
                category = v.category ?? "",
                code = v.code ?? "",
                name = v.name ?? "",
                displayorder = v.displayorder,
                status = v.status ?? "",
            }).ToList();
        }

        private static string ResolveRefName(List<ReferenceValueItem> refs, string category, string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return "";

            var normalizedCategory = NormalizeCategory(category);
            var match = refs.FirstOrDefault(r =>
                string.Equals(NormalizeCategory(r.category), normalizedCategory, StringComparison.OrdinalIgnoreCase) &&
                (string.Equals(r.id, id, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(r.code, id, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(r.name, id, StringComparison.OrdinalIgnoreCase)));

            return match?.name ?? id;
        }

        private static string FormatTimeRange(string start, string end)
        {
            var formattedStart = FormatClockTime(start);
            var formattedEnd = FormatClockTime(end);
            if (string.IsNullOrWhiteSpace(formattedStart) && string.IsNullOrWhiteSpace(formattedEnd))
                return "";
            if (string.IsNullOrWhiteSpace(formattedEnd))
                return formattedStart;
            return $"{formattedStart} - {formattedEnd}";
        }

        private static string FormatClockTime(string time)
        {
            if (string.IsNullOrWhiteSpace(time))
                return "";

            if (DateTime.TryParse(time, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                return parsed.ToString("h:mm tt", CultureInfo.InvariantCulture);

            var parts = time.Split(':');
            if (parts.Length < 2 || !int.TryParse(parts[0], out var hours))
                return time;

            var minutes = parts[1].Length >= 2 ? parts[1][..2] : parts[1];
            var ampm = hours >= 12 ? "PM" : "AM";
            var displayHours = hours % 12;
            if (displayHours == 0)
                displayHours = 12;

            return $"{displayHours}:{minutes} {ampm}";
        }

        private static string ResolveDisplayName(string first, string last, string full, string fallback)
        {
            if (!string.IsNullOrWhiteSpace(full))
                return full.Trim();

            var combined = string.Join(" ", new[] { first, last }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
            if (!string.IsNullOrWhiteSpace(combined))
                return combined;

            return fallback?.Trim() ?? "";
        }

        private async Task<List<StudentEnrollmentWithProfile>> GetCurrentEnrollmentsForClasses(string orgId, HashSet<string> classIds)
        {
            if (classIds.Count == 0)
                return new List<StudentEnrollmentWithProfile>();

            var all = await studentEnrollmentService.SelectWithProfile(new StudentEnrollmentSelectReq
            {
                organizationid = orgId,
                iscurrent = true,
            });

            return all.Where(e => classIds.Contains(e.classid ?? "")).ToList();
        }

        private static (List<StaffSchedule> schedules, Dictionary<string, Class> classById) FilterSchedulesForStaff(
            List<Class> assignedClasses,
            List<StaffSchedule> allSchedules)
        {
            var classById = new Dictionary<string, Class>(StringComparer.OrdinalIgnoreCase);

            if (assignedClasses.Count > 0)
            {
                var allowedClassIds = assignedClasses
                    .Select(c => c.id)
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                foreach (var cls in assignedClasses)
                {
                    if (!string.IsNullOrWhiteSpace(cls.id))
                        classById[cls.id] = cls;
                }

                var schedules = allSchedules
                    .Where(s => allowedClassIds.Contains(s.classid ?? ""))
                    .ToList();
                return (schedules, classById);
            }

            var scheduleClassIds = allSchedules
                .Select(s => s.classid)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var schedule in allSchedules)
            {
                if (string.IsNullOrWhiteSpace(schedule.classid) || classById.ContainsKey(schedule.classid))
                    continue;

                classById[schedule.classid] = new Class
                {
                    id = schedule.classid,
                    name = schedule.classname ?? "",
                };
            }

            return (allSchedules.Where(s => scheduleClassIds.Contains(s.classid ?? "")).ToList(), classById);
        }

        private static string ResolveClassSlotStatus(DateTime now, TimeSpan start, TimeSpan end)
        {
            var startDt = now.Date.Add(start);
            var endDt = now.Date.Add(end);
            if (now > endDt)
                return "completed";
            if (now >= startDt && now <= endDt)
                return "ongoing";
            return "upcoming";
        }

        private async Task<string> BuildAttendanceMarkedAsync(string orgId, List<StaffSchedule> todaySchedules)
        {
            if (todaySchedules.Count == 0)
                return "0/0";

            var today = DateTime.Now.Date;
            var classIdsToday = todaySchedules
                .Select(s => s.classid)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var attendance = await attendanceService.Select(new AttendanceSelectReq
            {
                organizationid = orgId,
                type = "student",
                fromdate = today,
                todate = today,
            });

            var markedCount = attendance
                .Where(a => classIdsToday.Contains(a.classid ?? ""))
                .Select(a => a.classid)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count();

            return $"{markedCount}/{classIdsToday.Count}";
        }

        private static string BuildNextClassIn(DateTime now, List<StaffSchedule> todaySchedules)
        {
            var upcoming = todaySchedules
                .Where(s => now.Date.Add(s.starttime) > now)
                .OrderBy(s => s.starttime)
                .ToList();

            if (upcoming.Count == 0)
                return "—";

            var diff = now.Date.Add(upcoming[0].starttime) - now;
            var totalMinutes = (int)Math.Round(diff.TotalMinutes, MidpointRounding.AwayFromZero);
            if (totalMinutes <= 0)
                return "—";

            var hours = totalMinutes / 60;
            var minutes = totalMinutes % 60;
            return hours > 0 ? $"{hours}h {minutes}m" : $"{minutes} min";
        }

        private static string FormatTimeSpan(TimeSpan time)
        {
            return time.ToString(@"hh\:mm\:ss", CultureInfo.InvariantCulture);
        }

        private static string NormalizeWeekday(string day)
        {
            if (string.IsNullOrWhiteSpace(day))
                return "";

            var trimmed = day.Trim();
            return char.ToUpper(trimmed[0], CultureInfo.InvariantCulture) + trimmed[1..].ToLower(CultureInfo.InvariantCulture);
        }

        private static string NormalizeCategory(string category)
        {
            return (category ?? "").Trim().ToLower(CultureInfo.InvariantCulture);
        }

        private static string ResolveScheduleColor(string classId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                return ScheduleColors[0];

            var index = Math.Abs(classId[0]) % ScheduleColors.Length;
            return ScheduleColors[index];
        }

        private static string? FindMatchingTimeSlot(IReadOnlyList<string> timeSlots, TimeSpan start, TimeSpan end)
        {
            var startMinutes = (int)start.TotalMinutes;
            var endMinutes = (int)end.TotalMinutes;

            foreach (var slot in timeSlots)
            {
                var slotMinutes = ParseMinutesFromTimeString(slot);
                if (slotMinutes >= startMinutes && slotMinutes < endMinutes)
                    return slot;
            }

            return timeSlots.FirstOrDefault();
        }

        private static int ParseMinutesFromTimeString(string time)
        {
            if (string.IsNullOrWhiteSpace(time))
                return 0;

            if (DateTime.TryParse(time, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                return parsed.Hour * 60 + parsed.Minute;

            var parts = time.Split(':');
            if (parts.Length < 2)
                return 0;

            if (!int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var hours))
                return 0;

            var minutePart = parts[1].Trim();
            var minuteDigits = new string(minutePart.TakeWhile(char.IsDigit).ToArray());
            if (!int.TryParse(minuteDigits, NumberStyles.Integer, CultureInfo.InvariantCulture, out var minutes))
                minutes = 0;

            var upper = time.ToUpper(CultureInfo.InvariantCulture);
            if (upper.Contains("PM", StringComparison.Ordinal) && hours < 12)
                hours += 12;
            if (upper.Contains("AM", StringComparison.Ordinal) && hours == 12)
                hours = 0;

            return hours * 60 + minutes;
        }
    }
}
