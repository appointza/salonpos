using Krios.Models;
using CampusModels = Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/krios/[controller]")]
    [ApiController]
    public class PageController : ControllerBase
    {
        ILogger<PageController> logger;
        PageService pageService;

        public PageController(ILogger<PageController> logger, PageService pageService)
        {
            this.logger = logger;
            this.pageService = pageService;
        }

        [HttpPost("GetStaffDashboardPage")]
        public async Task<ActionResult<ActionRes<CampusModels.StaffDashboardPageRes>>> GetStaffDashboardPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.StaffDashboardPageRes> result = new ActionRes<CampusModels.StaffDashboardPageRes>();
            result.item = await pageService.GetStaffDashboardPage(req.item);
            return Ok(result);
        }

        [HttpPost("GetStaffClassesPage")]
        public async Task<ActionResult<ActionRes<CampusModels.StaffClassesPageRes>>> GetStaffClassesPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.StaffClassesPageRes> result = new ActionRes<CampusModels.StaffClassesPageRes>();
            result.item = await pageService.GetStaffClassesPage(req.item);
            return Ok(result);
        }

        [HttpPost("GetStaffStudentsPage")]
        public async Task<ActionResult<ActionRes<CampusModels.StaffStudentsPageRes>>> GetStaffStudentsPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.StaffStudentsPageRes> result = new ActionRes<CampusModels.StaffStudentsPageRes>();
            result.item = await pageService.GetStaffStudentsPage(req.item);
            return Ok(result);
        }

        [HttpPost("GetStaffSchedulePage")]
        public async Task<ActionResult<ActionRes<CampusModels.StaffSchedulePageRes>>> GetStaffSchedulePage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.StaffSchedulePageRes> result = new ActionRes<CampusModels.StaffSchedulePageRes>();
            result.item = await pageService.GetStaffSchedulePage(req.item);
            return Ok(result);
        }

        [HttpPost("GetAdminStudentsPage")]
        public async Task<ActionResult<ActionRes<CampusModels.AdminStudentsPageRes>>> GetAdminStudentsPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.AdminStudentsPageRes> result = new ActionRes<CampusModels.AdminStudentsPageRes>();
            result.item = await pageService.GetAdminStudentsPage(req.item);
            return Ok(result);
        }

        [HttpPost("GetAdminStaffPage")]
        public async Task<ActionResult<ActionRes<CampusModels.AdminStaffPageRes>>> GetAdminStaffPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.AdminStaffPageRes> result = new ActionRes<CampusModels.AdminStaffPageRes>();
            result.item = await pageService.GetAdminStaffPage(req.item);
            return Ok(result);
        }

        [HttpPost("GetAdminTermsPage")]
        public async Task<ActionResult<ActionRes<CampusModels.AdminTermsPageRes>>> GetAdminTermsPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.AdminTermsPageRes> result = new ActionRes<CampusModels.AdminTermsPageRes>();
            result.item = await pageService.GetAdminTermsPage(req.item);
            return Ok(result);
        }

        [HttpPost("GetAdminClassesPage")]
        public async Task<ActionResult<ActionRes<CampusModels.AdminClassesPageRes>>> GetAdminClassesPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.AdminClassesPageRes> result = new ActionRes<CampusModels.AdminClassesPageRes>();
            result.item = await pageService.GetAdminClassesPage(req.item);
            return Ok(result);
        }

        [HttpPost("GetAdminSettingsPage")]
        public async Task<ActionResult<ActionRes<CampusModels.AdminSettingsPageRes>>> GetAdminSettingsPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.AdminSettingsPageRes> result = new ActionRes<CampusModels.AdminSettingsPageRes>();
            result.item = await pageService.GetAdminSettingsPage(req.item);
            return Ok(result);
        }

        [HttpPost("GetAdminOnboardingPage")]
        public async Task<ActionResult<ActionRes<CampusModels.AdminOnboardingPageRes>>> GetAdminOnboardingPage(ActionReq<CampusModels.PageReq> req)
        {
            ActionRes<CampusModels.AdminOnboardingPageRes> result = new ActionRes<CampusModels.AdminOnboardingPageRes>();
            result.item = await pageService.GetAdminOnboardingPage(req.item);
            return Ok(result);
        }
    }
}
