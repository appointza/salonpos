using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentController : ControllerBase
    {
        ILogger<AppointmentController> logger;
        AppointmentService appointmentService;

        public AppointmentController(ILogger<AppointmentController> logger, AppointmentService appointmentService)
        {
            this.logger = logger;
            this.appointmentService = appointmentService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Appointment>>> Entity()
        {
            ActionRes<Appointment> result = new ActionRes<Appointment>()
            {
               item = new Appointment()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Appointment>>>> Select(ActionReq<AppointmentSelectReq> req)
        {
            ActionRes<List<Appointment>> result = new ActionRes<List<Appointment>>();

            result.item = await appointmentService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Appointment>>> Insert(ActionReq<Appointment> req)
        {
            ActionRes<Appointment> result = new ActionRes<Appointment>();

            result.item = await appointmentService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Appointment>>> Update(ActionReq<Appointment> req)
        {
            ActionRes<Appointment> result = new ActionRes<Appointment>();

            result.item = await appointmentService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Appointment>>> Save(ActionReq<Appointment> req)
        {
            ActionRes<Appointment> result = new ActionRes<Appointment>();

            if(req.item.id > 0){
                result.item = await appointmentService.Update(req.item);
            }else{
                result.item = await appointmentService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<AppointmentDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await appointmentService.Delete(req.item);

            return Ok(result);
        }
    }
}
