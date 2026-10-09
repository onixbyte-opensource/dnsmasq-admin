import { existsSync } from "node:fs"
import http from "node:http"
import { env } from "./env"

export type ReloadOutcome =
  | { status: "restarted"; detail: string }
  | { status: "skipped"; detail: string }
  | { status: "failed"; detail: string }

interface DockerResponse {
  statusCode: number
  body: string
}

const REQUEST_TIMEOUT_MS = 5000

function dockerRequest(socketPath: string, requestPath: string): Promise<DockerResponse> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        socketPath,
        path: requestPath,
        method: "POST",
        headers: { Host: "localhost", Accept: "application/json" },
      },
      (response) => {
        let body = ""
        response.setEncoding("utf8")
        response.on("data", (chunk) => {
          body += chunk
        })
        response.on("end", () => {
          resolve({ statusCode: response.statusCode ?? 0, body })
        })
      }
    )

    request.on("error", reject)
    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`Docker API 请求超时（${REQUEST_TIMEOUT_MS}ms）`))
    })
    request.end()
  })
}

function failureReason(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Restart the dnsmasq container over the Docker socket.
 *
 * Never throws: hosts without a Docker socket (e.g. developing on Windows) get a "skipped"
 * outcome so the UI can report it instead of blowing up.
 */
export async function restartDnsmasqContainer(): Promise<ReloadOutcome> {
  if (!env.containerName) {
    return { status: "skipped", detail: "未配置 DNSMASQ_CONTAINER_NAME，跳过重启" }
  }

  if (!existsSync(env.dockerSocket)) {
    return { status: "skipped", detail: `Docker socket 不存在：${env.dockerSocket}，跳过重启` }
  }

  try {
    const response = await dockerRequest(
      env.dockerSocket,
      `/containers/${encodeURIComponent(env.containerName)}/restart`
    )

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return { status: "restarted", detail: `容器 ${env.containerName} 已重启` }
    }

    if (response.statusCode === 404) {
      return { status: "failed", detail: `找不到容器 ${env.containerName}` }
    }

    if (response.statusCode === 403) {
      return { status: "failed", detail: "Docker API 拒绝访问，请检查 socket 权限" }
    }

    const remote = response.body.trim().slice(0, 200)
    return {
      status: "failed",
      detail: `Docker API 返回 ${response.statusCode}${remote ? `：${remote}` : ""}`,
    }
  } catch (error) {
    return { status: "failed", detail: failureReason(error) }
  }
}
