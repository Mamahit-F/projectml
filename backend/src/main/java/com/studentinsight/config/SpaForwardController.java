package com.studentinsight.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards React Router SPA client-side routes to /index.html when the frontend
 * production bundle is served directly from Spring Boot static resources.
 * Never intercepts /api/**, /actuator/**, /assets/**, Swagger, or static file extensions.
 */
@Controller
public class SpaForwardController {

    @GetMapping(value = {
            "/{p1:^(?!api$|actuator$|assets$|v3$|swagger-ui$)[^\\.]*}",
            "/{p1:^(?!api$|actuator$|assets$|v3$|swagger-ui$)[^\\.]*}/{p2:[^\\.]*}",
            "/{p1:^(?!api$|actuator$|assets$|v3$|swagger-ui$)[^\\.]*}/{p2:[^\\.]*}/{p3:[^\\.]*}"
    })
    public String forwardSpa() {
        return "forward:/index.html";
    }
}
