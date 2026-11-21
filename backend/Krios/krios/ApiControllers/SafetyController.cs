using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class SafetyController : ControllerBase
    {
        private readonly SafetyReportService safetyReportService;

        public SafetyController(SafetyReportService safetyReportService)
        {
            this.safetyReportService = safetyReportService;
        }

        [HttpPost("Submit")]
        public async Task<ActionResult<ActionRes<SafetySubmitRes>>> Submit(ActionReq<SafetySubmitReq> req)
        {
            var result = new ActionRes<SafetySubmitRes>
            {
                item = await safetyReportService.Submit(req.item ?? new SafetySubmitReq()),
            };
            return Ok(result);
        }
    }
}
