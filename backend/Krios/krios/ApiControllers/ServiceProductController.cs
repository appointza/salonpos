using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class ServiceProductController : ControllerBase
    {
        ILogger<ServiceProductController> logger;
        ServiceProductService serviceproductService;

        public ServiceProductController(ILogger<ServiceProductController> logger, ServiceProductService serviceproductService)
        {
            this.logger = logger;
            this.serviceproductService = serviceproductService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<ServiceProduct>>> Entity()
        {
            ActionRes<ServiceProduct> result = new ActionRes<ServiceProduct>()
            {
               item = new ServiceProduct()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<ServiceProduct>>>> Select(ActionReq<ServiceProductSelectReq> req)
        {
            ActionRes<List<ServiceProduct>> result = new ActionRes<List<ServiceProduct>>();

            result.item = await serviceproductService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<ServiceProduct>>> Insert(ActionReq<ServiceProduct> req)
        {
            ActionRes<ServiceProduct> result = new ActionRes<ServiceProduct>();

            result.item = await serviceproductService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<ServiceProduct>>> Update(ActionReq<ServiceProduct> req)
        {
            ActionRes<ServiceProduct> result = new ActionRes<ServiceProduct>();

            result.item = await serviceproductService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<ServiceProduct>>> Save(ActionReq<ServiceProduct> req)
        {
            ActionRes<ServiceProduct> result = new ActionRes<ServiceProduct>();

            if(req.item.id > 0){
                result.item = await serviceproductService.Update(req.item);
            }else{
                result.item = await serviceproductService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ServiceProductDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await serviceproductService.Delete(req.item);

            return Ok(result);
        }
    }
}
