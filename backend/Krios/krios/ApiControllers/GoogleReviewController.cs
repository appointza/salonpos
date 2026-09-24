using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class GoogleReviewController : ControllerBase
    {
        ILogger<GoogleReviewController> logger;
        GoogleReviewService googlereviewService;

        public GoogleReviewController(ILogger<GoogleReviewController> logger, GoogleReviewService googlereviewService)
        {
            this.logger = logger;
            this.googlereviewService = googlereviewService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<GoogleReview>>> Entity()
        {
            ActionRes<GoogleReview> result = new ActionRes<GoogleReview>()
            {
               item = new GoogleReview()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<GoogleReview>>>> Select(ActionReq<GoogleReviewSelectReq> req)
        {
            ActionRes<List<GoogleReview>> result = new ActionRes<List<GoogleReview>>();

            result.item = await googlereviewService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<GoogleReview>>> Insert(ActionReq<GoogleReview> req)
        {
            ActionRes<GoogleReview> result = new ActionRes<GoogleReview>();

            result.item = await googlereviewService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<GoogleReview>>> Update(ActionReq<GoogleReview> req)
        {
            ActionRes<GoogleReview> result = new ActionRes<GoogleReview>();

            result.item = await googlereviewService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<GoogleReview>>> Save(ActionReq<GoogleReview> req)
        {
            ActionRes<GoogleReview> result = new ActionRes<GoogleReview>();

            if(req.item.id > 0){
                result.item = await googlereviewService.Update(req.item);
            }else{
                result.item = await googlereviewService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<GoogleReviewDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await googlereviewService.Delete(req.item);

            return Ok(result);
        }
    }
}
