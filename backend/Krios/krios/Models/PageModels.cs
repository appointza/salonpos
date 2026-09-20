namespace Krios.Models.Krios
{
    public class PageReq
    {
        public string organizationid { get; set; } = "";
        public string staffid { get; set; } = "";
        /// <summary>Logged-in user email when JWT user context is unavailable (staff resolution fallback).</summary>
        public string email { get; set; } = "";
    }

    public class ReferenceValueItem
    {
        public string id { get; set; } = "";
        public string category { get; set; } = "";
        public string code { get; set; } = "";
        public string name { get; set; } = "";
        public int displayorder { get; set; }
        public string status { get; set; } = "";
    }

    // --- Staff Dashboard ---
    public class StaffDashboardPageRes
    {
        public long totalstudents { get; set; }
        public long classestoday { get; set; }
        public string attendancemarked { get; set; } = "0/0";
        public string nextclassin { get; set; } = "—";
        public List<StaffTodayClassItem> todayclasses { get; set; } = new();
    }

    public class StaffTodayClassItem
    {
        public string subject { get; set; } = "";
        public string classname { get; set; } = "";
        public string time { get; set; } = "";
        public string status { get; set; } = "";
    }

    // --- Staff Classes ---
    public class StaffClassesPageRes
    {
        public long totalstudents { get; set; }
        public long totalhours { get; set; }
        public List<StaffClassCardItem> classes { get; set; } = new();
    }

    public class StaffClassCardItem
    {
        public string id { get; set; } = "";
        public string name { get; set; } = "";
        public string subject { get; set; } = "";
        public int students { get; set; }
        public string room { get; set; } = "";
        public string schedule { get; set; } = "";
    }

    // --- Staff Students ---
    public class StaffStudentsPageRes
    {
        public string staffid { get; set; } = "";
        public List<StaffStudentRowItem> students { get; set; } = new();
        public List<StaffClassOptionItem> classes { get; set; } = new();
        public List<ReferenceValueItem> referencevalues { get; set; } = new();
        public List<string> academicyears { get; set; } = new();
        public List<string> sections { get; set; } = new();
    }

    public class StaffStudentRowItem : StudentEnrollmentWithProfile
    {
        public string displayname { get; set; } = "";
    }

    public class StaffClassOptionItem
    {
        public string id { get; set; } = "";
        public string name { get; set; } = "";
        public string grade { get; set; } = "";
        public string section { get; set; } = "";
        public string academicyear { get; set; } = "";
    }

    // --- Staff Schedule ---
    public class StaffSchedulePageRes
    {
        public List<string> weekdays { get; set; } = new();
        public List<string> timeslots { get; set; } = new();
        public List<StaffScheduleGridCell> cells { get; set; } = new();
    }

    public class StaffScheduleGridCell
    {
        public string day { get; set; } = "";
        public string timeslot { get; set; } = "";
        public string classname { get; set; } = "";
        public string room { get; set; } = "";
        public string color { get; set; } = "primary";
    }

    // --- Admin Students ---
    public class AdminStudentsPageRes
    {
        public List<AdminStudentRowItem> rows { get; set; } = new();
        public List<StaffClassOptionItem> classoptions { get; set; } = new();
        public List<ReferenceValueItem> referencevalues { get; set; } = new();
    }

    public class AdminStudentRowItem
    {
        public string id { get; set; } = "";
        public string studentid { get; set; } = "";
        public string name { get; set; } = "";
        public string grade { get; set; } = "";
        public string email { get; set; } = "";
        public string phone { get; set; } = "";
        public string status { get; set; } = "";
    }

    // --- Admin Staff ---
    public class AdminStaffPageRes
    {
        public List<AdminStaffRowItem> staff { get; set; } = new();
        public List<ReferenceValueItem> referencevalues { get; set; } = new();
    }

    public class AdminStaffRowItem
    {
        public string id { get; set; } = "";
        public string staffid { get; set; } = "";
        public string firstname { get; set; } = "";
        public string lastname { get; set; } = "";
        public string fullname { get; set; } = "";
        public string email { get; set; } = "";
        public string phone { get; set; } = "";
        public string role { get; set; } = "";
        public string rolename { get; set; } = "";
        public string department { get; set; } = "";
        public string departmentname { get; set; } = "";
        public string status { get; set; } = "";
        public string subjects { get; set; } = "";
    }

    // --- Admin Terms ---
    public class AdminTermsPageRes
    {
        public List<AdminTermRowItem> terms { get; set; } = new();
        public List<ReferenceValueItem> referencevalues { get; set; } = new();
    }

    public class AdminTermRowItem
    {
        public string id { get; set; } = "";
        public string name { get; set; } = "";
        public string startdate { get; set; } = "";
        public string enddate { get; set; } = "";
        public string status { get; set; } = "";
        public string academicyear { get; set; } = "";
        public string academicyearname { get; set; } = "";
        public string description { get; set; } = "";
    }

    // --- Admin Classes (list view) ---
    public class AdminClassesPageRes
    {
        public List<AdminClassRowItem> classes { get; set; } = new();
        public List<ReferenceValueItem> referencevalues { get; set; } = new();
        public List<AdminStaffOptionItem> staffoptions { get; set; } = new();
        public List<AdminTermOptionItem> termoptions { get; set; } = new();
    }

    public class AdminClassRowItem
    {
        public string id { get; set; } = "";
        public string name { get; set; } = "";
        public string subject { get; set; } = "";
        public string teacher { get; set; } = "";
        public int students { get; set; }
        public string room { get; set; } = "";
        public string schedule { get; set; } = "";
        public string mentorid { get; set; } = "";
        public string mentorname { get; set; } = "";
        public string assistantmentorid { get; set; } = "";
        public string assistantmentorname { get; set; } = "";
        public string grade { get; set; } = "";
        public string section { get; set; } = "";
        public int capacity { get; set; }
        public string academicyear { get; set; } = "";
        public string termid { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class AdminStaffOptionItem
    {
        public string id { get; set; } = "";
        public string name { get; set; } = "";
    }

    public class AdminTermOptionItem
    {
        public string id { get; set; } = "";
        public string name { get; set; } = "";
    }

    // --- Admin Settings ---
    public class AdminSettingsPageRes
    {
        public List<ReferenceValueItem> referencevalues { get; set; } = new();
        public Dictionary<string, int> categorycounts { get; set; } = new();
    }

    // --- Admin Onboarding ---
    public class AdminOnboardingPageRes
    {
        public List<ReferenceValueItem> referencevalues { get; set; } = new();
        public List<AdminTermRowItem> terms { get; set; } = new();
        public bool iscomplete { get; set; }
        public int progresspercent { get; set; }
    }
}
