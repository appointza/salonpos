using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class ServiceController : ControllerBase
    {
        ILogger<ServiceController> logger;
        ServiceService serviceService;

        public ServiceController(ILogger<ServiceController> logger, ServiceService serviceService)
        {
            this.logger = logger;
            this.serviceService = serviceService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Service>>> Entity()
        {
            ActionRes<Service> result = new ActionRes<Service>()
            {
               item = new Service()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Service>>>> Select(ActionReq<ServiceSelectReq> req)
        {
            ActionRes<List<Service>> result = new ActionRes<List<Service>>();

            result.item = await serviceService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Service>>> Insert(ActionReq<Service> req)
        {
            ActionRes<Service> result = new ActionRes<Service>();

            result.item = await serviceService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Service>>> Update(ActionReq<Service> req)
        {
            ActionRes<Service> result = new ActionRes<Service>();

            result.item = await serviceService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Service>>> Save(ActionReq<Service> req)
        {
            ActionRes<Service> result = new ActionRes<Service>();

            if(req.item.id > 0){
                result.item = await serviceService.Update(req.item);
            }else{
                result.item = await serviceService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ServiceDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await serviceService.Delete(req.item);

            return Ok(result);
        }
    }
}
