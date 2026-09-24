using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class PayrollController : ControllerBase
    {
        ILogger<PayrollController> logger;
        PayrollService payrollService;

        public PayrollController(ILogger<PayrollController> logger, PayrollService payrollService)
        {
            this.logger = logger;
            this.payrollService = payrollService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Payroll>>> Entity()
        {
            ActionRes<Payroll> result = new ActionRes<Payroll>()
            {
               item = new Payroll()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Payroll>>>> Select(ActionReq<PayrollSelectReq> req)
        {
            ActionRes<List<Payroll>> result = new ActionRes<List<Payroll>>();

            result.item = await payrollService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Payroll>>> Insert(ActionReq<Payroll> req)
        {
            ActionRes<Payroll> result = new ActionRes<Payroll>();

            result.item = await payrollService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Payroll>>> Update(ActionReq<Payroll> req)
        {
            ActionRes<Payroll> result = new ActionRes<Payroll>();

            result.item = await payrollService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Payroll>>> Save(ActionReq<Payroll> req)
        {
            ActionRes<Payroll> result = new ActionRes<Payroll>();

            if(req.item.id > 0){
                result.item = await payrollService.Update(req.item);
            }else{
                result.item = await payrollService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<PayrollDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await payrollService.Delete(req.item);

            return Ok(result);
        }
    }
}
