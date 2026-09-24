using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class BrandAppController : ControllerBase
    {
        ILogger<BrandAppController> logger;
        BrandAppService brandappService;

        public BrandAppController(ILogger<BrandAppController> logger, BrandAppService brandappService)
        {
            this.logger = logger;
            this.brandappService = brandappService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<BrandApp>>> Entity()
        {
            ActionRes<BrandApp> result = new ActionRes<BrandApp>()
            {
               item = new BrandApp()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<BrandApp>>>> Select(ActionReq<BrandAppSelectReq> req)
        {
            ActionRes<List<BrandApp>> result = new ActionRes<List<BrandApp>>();

            result.item = await brandappService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<BrandApp>>> Insert(ActionReq<BrandApp> req)
        {
            ActionRes<BrandApp> result = new ActionRes<BrandApp>();

            result.item = await brandappService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<BrandApp>>> Update(ActionReq<BrandApp> req)
        {
            ActionRes<BrandApp> result = new ActionRes<BrandApp>();

            result.item = await brandappService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<BrandApp>>> Save(ActionReq<BrandApp> req)
        {
            ActionRes<BrandApp> result = new ActionRes<BrandApp>();

            if(req.item.id > 0){
                result.item = await brandappService.Update(req.item);
            }else{
                result.item = await brandappService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<BrandAppDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await brandappService.Delete(req.item);

            return Ok(result);
        }
    }
}
