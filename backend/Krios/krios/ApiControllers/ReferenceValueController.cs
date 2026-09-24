using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReferenceValueController : ControllerBase
    {
        ILogger<ReferenceValueController> logger;
        ReferenceValueService referencevalueService;

        public ReferenceValueController(ILogger<ReferenceValueController> logger, ReferenceValueService referencevalueService)
        {
            this.logger = logger;
            this.referencevalueService = referencevalueService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<ReferenceValue>>> Entity()
        {
            ActionRes<ReferenceValue> result = new ActionRes<ReferenceValue>()
            {
               item = new ReferenceValue()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<ReferenceValue>>>> Select(ActionReq<ReferenceValueSelectReq> req)
        {
            ActionRes<List<ReferenceValue>> result = new ActionRes<List<ReferenceValue>>();

            result.item = await referencevalueService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<ReferenceValue>>> Insert(ActionReq<ReferenceValue> req)
        {
            ActionRes<ReferenceValue> result = new ActionRes<ReferenceValue>();

            result.item = await referencevalueService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<ReferenceValue>>> Update(ActionReq<ReferenceValue> req)
        {
            ActionRes<ReferenceValue> result = new ActionRes<ReferenceValue>();

            result.item = await referencevalueService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<ReferenceValue>>> Save(ActionReq<ReferenceValue> req)
        {
            ActionRes<ReferenceValue> result = new ActionRes<ReferenceValue>();

            if(req.item.id > 0){
                result.item = await referencevalueService.Update(req.item);
            }else{
                result.item = await referencevalueService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ReferenceValueDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await referencevalueService.Delete(req.item);

            return Ok(result);
        }
    }
}
