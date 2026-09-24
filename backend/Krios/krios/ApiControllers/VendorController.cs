using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class VendorController : ControllerBase
    {
        ILogger<VendorController> logger;
        VendorService vendorService;

        public VendorController(ILogger<VendorController> logger, VendorService vendorService)
        {
            this.logger = logger;
            this.vendorService = vendorService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Vendor>>> Entity()
        {
            ActionRes<Vendor> result = new ActionRes<Vendor>()
            {
               item = new Vendor()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Vendor>>>> Select(ActionReq<VendorSelectReq> req)
        {
            ActionRes<List<Vendor>> result = new ActionRes<List<Vendor>>();

            result.item = await vendorService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Vendor>>> Insert(ActionReq<Vendor> req)
        {
            ActionRes<Vendor> result = new ActionRes<Vendor>();

            result.item = await vendorService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Vendor>>> Update(ActionReq<Vendor> req)
        {
            ActionRes<Vendor> result = new ActionRes<Vendor>();

            result.item = await vendorService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Vendor>>> Save(ActionReq<Vendor> req)
        {
            ActionRes<Vendor> result = new ActionRes<Vendor>();

            if(req.item.id > 0){
                result.item = await vendorService.Update(req.item);
            }else{
                result.item = await vendorService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<VendorDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await vendorService.Delete(req.item);

            return Ok(result);
        }
    }
}
